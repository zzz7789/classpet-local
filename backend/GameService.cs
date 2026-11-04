using System.Data;
using System.Text.Json;
using Dapper;
using MySqlConnector;
using static ClassPet.Input;
namespace ClassPet;
public sealed class GameService(Database database){
 private const string Access="(owner_id=@teacherId OR EXISTS (SELECT 1 FROM classroom_teachers ct WHERE ct.class_id=classrooms.id AND ct.teacher_id=@teacherId))";
 public async Task<object> State(string teacherId,string? classId,string? studentId){
  await using var c=database.Open();await c.OpenAsync();
  var classes=await Database.Rows(c,"SELECT id,name,owner_id,created_at AS created FROM classrooms WHERE "+Access+" ORDER BY created_at DESC",new{teacherId});
  if(string.IsNullOrEmpty(classId))return new{classes,products=Catalog.Products,species=Catalog.Species,decorations=Catalog.Decorations};
  var current=classes.Find(x=>x.S("id")==classId)??throw new AppError("无权访问该班级",403);
  var members=await Database.Rows(c,"SELECT s.id,s.name,s.is_active,s.balance,s.species,s.pet_name,s.experience AS xp,s.energy,s.mood,COALESCE((SELECT SUM(CASE WHEN l.delta>0 OR l.reference_id LIKE 'award:%' THEN l.delta ELSE 0 END) FROM ledger l WHERE l.student_id=s.id),0) AS points FROM students s WHERE s.class_id=@classId ORDER BY s.created_at,s.name",new{classId});
  var decorations=await Database.Rows(c,"SELECT d.student_id,d.item_id AS id,d.equipped FROM student_decorations d JOIN students s ON s.id=d.student_id WHERE s.class_id=@classId",new{classId});
  foreach(var member in members)member["decor"]=decorations.Where(d=>d.S("student_id")==member.S("id")&&d.I("equipped")==1).Select(d=>d.S("id")).ToArray();
  var tasks=await Database.Rows(c,"SELECT id,title,description,reward,due_at AS due,target_id AS target,status,created_at FROM tasks WHERE class_id=@classId ORDER BY created_at DESC",new{classId});
  var completions=await Database.Rows(c,"SELECT x.task_id,x.student_id FROM completions x JOIN tasks t ON t.id=x.task_id WHERE t.class_id=@classId",new{classId});
  var ledger=await Database.Rows(c,"SELECT l.id,l.student_id,l.delta,l.reason,l.created_at AS created,s.name AS student FROM ledger l JOIN students s ON s.id=l.student_id WHERE s.class_id=@classId ORDER BY l.created_at DESC LIMIT 200",new{classId});
  object? selected=null;
  if(!string.IsNullOrEmpty(studentId)){
   var seat=members.Find(x=>x.S("id")==studentId&&x.I("is_active")==1)??throw new AppError("学生不存在或已移出名单",404);
   selected=new{seat,decorations=decorations.Where(d=>d.S("student_id")==studentId).Select(d=>new{id=d.S("id"),equipped=d.I("equipped")==1}).ToArray(),inventory=await Database.Rows(c,"SELECT item_id AS item,quantity FROM inventory WHERE student_id=@studentId",new{studentId}),ledger=await Database.Rows(c,"SELECT id,delta,reason,created_at AS created FROM ledger WHERE student_id=@studentId ORDER BY created_at DESC LIMIT 100",new{studentId})};
  }
  var teachers=await Database.Rows(c,"SELECT t.id,t.username,1 AS is_owner FROM teachers t JOIN classrooms cl ON cl.owner_id=t.id WHERE cl.id=@classId UNION ALL SELECT t.id,t.username,0 AS is_owner FROM teachers t JOIN classroom_teachers ct ON ct.teacher_id=t.id WHERE ct.class_id=@classId ORDER BY is_owner DESC,username",new{classId});
  return new{classes,current,members,tasks,completions,ledger,selected,teachers,canManageTeachers=current.S("owner_id")==teacherId,products=Catalog.Products,species=Catalog.Species,decorations=Catalog.Decorations};
 }
 public async Task<object> Export(string teacherId,string classId){await using var c=database.Open();await c.OpenAsync();var classroom=await Database.One(c,"SELECT id,name,created_at FROM classrooms WHERE id=@classId AND "+Access,new{teacherId,classId})??throw new AppError("无权访问该班级",403);return new{format="classpet-local-v1",exportedAt=DateTime.UtcNow,classroom,teachers=await Database.Rows(c,"SELECT t.id,t.username FROM teachers t WHERE t.id IN (SELECT owner_id FROM classrooms WHERE id=@classId UNION SELECT teacher_id FROM classroom_teachers WHERE class_id=@classId)",new{classId}),members=await Database.Rows(c,"SELECT * FROM students WHERE class_id=@classId",new{classId}),tasks=await Database.Rows(c,"SELECT * FROM tasks WHERE class_id=@classId",new{classId}),completions=await Database.Rows(c,"SELECT x.* FROM completions x JOIN tasks t ON t.id=x.task_id WHERE t.class_id=@classId",new{classId}),ledger=await Database.Rows(c,"SELECT l.* FROM ledger l JOIN students s ON s.id=l.student_id WHERE s.class_id=@classId",new{classId}),inventory=await Database.Rows(c,"SELECT i.* FROM inventory i JOIN students s ON s.id=i.student_id WHERE s.class_id=@classId",new{classId}),decorations=await Database.Rows(c,"SELECT d.* FROM student_decorations d JOIN students s ON s.id=d.student_id WHERE s.class_id=@classId",new{classId}),audit=await Database.Rows(c,"SELECT kind,detail,created_at FROM operations WHERE class_id=@classId ORDER BY created_at",new{classId})};}
 public async Task<JsonElement> Act(string teacherId,JsonElement b,string key){
  if(!System.Text.RegularExpressions.Regex.IsMatch(key,@"^[a-zA-Z0-9-]{10,100}$"))throw new AppError("请求编号无效");
  var action=Text(b.Get("action"),40);var classId=b.Get("classId");var bodyHash=Hash(b.GetRawText());
  await using var c=database.Open();await c.OpenAsync();await using var tx=await c.BeginTransactionAsync(IsolationLevel.ReadCommitted);
  try{
   // UNIQUE operation insert makes simultaneous retries wait, then replay the committed result.
   await c.ExecuteAsync("INSERT INTO operations(teacher_id,request_key,kind,request_hash,class_id,detail,result_json,created_at) VALUES(@teacherId,@key,@action,@bodyHash,NULL,'','{}',UTC_TIMESTAMP(6))",new{teacherId,key,action,bodyHash},tx);
   var result=new Dictionary<string,object?>{{"ok",true}};string detail=action;
   if(action=="createClass"){
    var name=Text(b.Get("name"),50);if(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM classrooms WHERE owner_id=@teacherId",new{teacherId},tx)>=50)throw new AppError("最多创建50个班级");classId=Id();await c.ExecuteAsync("INSERT INTO classrooms(id,owner_id,name,created_at) VALUES(@classId,@teacherId,@name,UTC_TIMESTAMP(6))",new{classId,teacherId,name},tx);result["classId"]=classId;detail="创建班级："+name;
   }else{
    // All writes in one classroom lock the same row: no double spending or racing task rewards.
    var classroomRow=await Database.One(c,"SELECT id,owner_id FROM classrooms WHERE id=@classId FOR UPDATE",new{classId},tx)??throw new AppError("只有本班老师可以操作",403);
    var isOwner=classroomRow.S("owner_id")==teacherId;
    if(!isOwner&&await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM classroom_teachers WHERE class_id=@classId AND teacher_id=@teacherId",new{classId,teacherId},tx)==0)throw new AppError("只有本班老师可以操作",403);
    async Task<Dictionary<string,object?>> Student(string id,bool active=true)=>await Database.One(c,"SELECT * FROM students WHERE id=@id AND class_id=@classId"+(active?" AND is_active=1":"")+" FOR UPDATE",new{id,classId},tx)??throw new AppError("学生不存在或已移出名单",404);
    async Task Ledger(string id,int delta,string reason,string reference){var changed=await c.ExecuteAsync("UPDATE students SET balance=balance+@delta WHERE id=@id AND balance+@delta>=0",new{id,delta},tx);if(changed!=1)throw new AppError("积分不足，不能扣成负数");await c.ExecuteAsync("INSERT INTO ledger(id,student_id,delta,reason,reference_id,actor_id,created_at) VALUES(@entry,@id,@delta,@reason,@reference,@teacherId,UTC_TIMESTAMP(6))",new{entry=Id(),id,delta,reason,reference,teacherId},tx);}
    switch(action){
     case "addTeacher":{
      if(!isOwner)throw new AppError("只有班级创建者可以管理老师",403);
      var username=NormalName(b.Get("username"));var teacher=await Database.One(c,"SELECT id,username FROM teachers WHERE normalized_name=@username",new{username},tx)??throw new AppError("该老师账号不存在，请先注册账号");
      var id=teacher.S("id");if(id==classroomRow.S("owner_id")||await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM classroom_teachers WHERE class_id=@classId AND teacher_id=@id",new{classId,id},tx)>0)throw new AppError("该老师已在本班");
      if(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM classroom_teachers WHERE class_id=@classId",new{classId},tx)>=19)throw new AppError("每班最多20位老师");
      await c.ExecuteAsync("INSERT INTO classroom_teachers(class_id,teacher_id,created_at) VALUES(@classId,@id,UTC_TIMESTAMP(6))",new{classId,id},tx);detail="添加协作老师："+teacher.S("username");break;
     }
     case "removeTeacher":{
      if(!isOwner)throw new AppError("只有班级创建者可以管理老师",403);
      var id=b.Get("teacherId");if(id==classroomRow.S("owner_id"))throw new AppError("不能移除班级创建者");
      var teacher=await Database.One(c,"SELECT t.username FROM classroom_teachers ct JOIN teachers t ON t.id=ct.teacher_id WHERE ct.class_id=@classId AND ct.teacher_id=@id",new{classId,id},tx)??throw new AppError("该老师不在本班");
      await c.ExecuteAsync("DELETE FROM classroom_teachers WHERE class_id=@classId AND teacher_id=@id",new{classId,id},tx);detail="移除协作老师："+teacher.S("username");break;
     }
     case "renameClass":{var name=Text(b.Get("name"),50);await c.ExecuteAsync("UPDATE classrooms SET name=@name WHERE id=@classId",new{name,classId},tx);detail="修改班级名："+name;break;}
     case "importStudents":{
      var names=Text(b.Get("names"),5000).Split(['\n',',','，'],StringSplitOptions.TrimEntries|StringSplitOptions.RemoveEmptyEntries);if(names.Length is <1 or >100)throw new AppError("每次填写1–100名学生");if(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM students WHERE class_id=@classId",new{classId},tx)+names.Length>500)throw new AppError("每班最多500名学生");
      for(int i=0;i<names.Length;i++){var name=Text(names[i],30);var id=Id();var sp=Catalog.Species[i%Catalog.Species.Length];await c.ExecuteAsync("INSERT INTO students(id,class_id,name,species,pet_name,created_at) VALUES(@id,@classId,@name,@species,@petName,UTC_TIMESTAMP(6))",new{id,classId,name,species=sp.Id,petName=sp.Name},tx);await c.ExecuteAsync("INSERT INTO inventory(student_id,item_id,quantity) VALUES(@id,'cookie',1)",new{id},tx);}result["count"]=names.Length;detail=$"添加学生 {names.Length} 人";break;
     }
     case "renameStudent":{var s=await Student(b.Get("seatId"),false);var name=Text(b.Get("name"),30);await c.ExecuteAsync("UPDATE students SET name=@name WHERE id=@id",new{name,id=s.S("id")},tx);detail="修改学生姓名："+name;break;}
     case "toggleStudent":{var s=await Student(b.Get("seatId"),false);await c.ExecuteAsync("UPDATE students SET is_active=NOT is_active WHERE id=@id",new{id=s.S("id")},tx);detail=(s.I("is_active")==1?"移出学生：":"恢复学生：")+s.S("name");break;}
     case "createTask":case "editTask":{
      var title=Text(b.Get("title"),60);if(System.Text.RegularExpressions.Regex.IsMatch(title,"回答|举手|课堂讨论"))throw new AppError("回答问题请直接用课堂奖励，不要添加成作业");var description=b.Get("description");if(description.Length>1000)throw new AppError("说明过长");var reward=Range(b.Number("reward"),1,100);string? target=string.IsNullOrEmpty(b.Get("target"))?null:b.Get("target");if(target!=null)await Student(target);DateTime? due=null;if(!string.IsNullOrEmpty(b.Get("due"))){if(!DateTimeOffset.TryParse(b.Get("due"),out var parsed))throw new AppError("截止时间无效");due=parsed.UtcDateTime;}
      if(action=="createTask"){var id=Id();await c.ExecuteAsync("INSERT INTO tasks(id,class_id,title,description,reward,due_at,target_id,created_at) VALUES(@id,@classId,@title,@description,@reward,@due,@target,UTC_TIMESTAMP(6))",new{id,classId,title,description,reward,due,target},tx);result["taskId"]=id;}else{var id=b.Get("taskId");_=await Database.One(c,"SELECT id FROM tasks WHERE id=@id AND class_id=@classId FOR UPDATE",new{id,classId},tx)??throw new AppError("作业不存在");if(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM completions WHERE task_id=@id",new{id},tx)>0)throw new AppError("已有学生完成，不能再修改奖励和对象");await c.ExecuteAsync("UPDATE tasks SET title=@title,description=@description,reward=@reward,due_at=@due,target_id=@target WHERE id=@id",new{id,title,description,reward,due,target},tx);}detail="保存作业："+title;break;
     }
     case "closeTask":{var id=b.Get("taskId");_=await Database.One(c,"SELECT id FROM tasks WHERE id=@id AND class_id=@classId",new{id,classId},tx)??throw new AppError("作业不存在");var status=b.Flag("reopen")?"open":"closed";await c.ExecuteAsync("UPDATE tasks SET status=@status WHERE id=@id",new{id,status},tx);detail="修改作业状态："+status;break;}
     case "completeTasks":{
      var taskId=b.Get("taskId");var task=await Database.One(c,"SELECT * FROM tasks WHERE id=@taskId AND class_id=@classId AND status='open' FOR UPDATE",new{taskId,classId},tx)??throw new AppError("作业已关闭或不存在");var ids=Ids(b);int added=0;
      foreach(var id in ids){await Student(id);if(task.S("target_id")!=""&&task.S("target_id")!=id)throw new AppError("该学生不属于这项作业");if(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM completions WHERE task_id=@taskId AND student_id=@id",new{taskId,id},tx)>0)continue;await c.ExecuteAsync("INSERT INTO completions(task_id,student_id,completed_at) VALUES(@taskId,@id,UTC_TIMESTAMP(6))",new{taskId,id},tx);await Ledger(id,task.I("reward"),"完成作业："+task.S("title"),"task:"+taskId+":"+id);added++;}result["count"]=added;detail=$"确认作业完成 {added} 人："+task.S("title");break;
     }
     case "award":{
      var ids=Ids(b);var delta=Range(b.Number("delta"),-100,100);if(delta==0)throw new AppError("积分不能为0");var classroom=b.Flag("classroom");var reason=classroom?"课堂回答":Text(b.Get("reason"),100);if(classroom&&delta!=3)throw new AppError("回答问题每次奖励3积分");
      foreach(var id in ids){var s=await Student(id);if(classroom){var start=DateTime.UtcNow.AddHours(8).Date.AddHours(-8);if(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM ledger WHERE student_id=@id AND reason='课堂回答' AND created_at>=@start",new{id,start},tx)>=5)throw new AppError(s.S("name")+" 今日回答奖励已达5次");}await Ledger(id,delta,reason,"award:"+key+":"+id);}detail=$"{reason}：{ids.Length} 人，每人 {delta:+0;-0} 积分";break;
     }
     case "buyDecoration":case "equipDecoration":{
      var student=await Student(b.Get("seatId"));var id=student.S("id");
      var item=Catalog.Decorations.FirstOrDefault(d=>d.Id==b.Get("item"))??throw new AppError("装扮不存在");
      var owned=await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM student_decorations WHERE student_id=@id AND item_id=@item",new{id,item=item.Id},tx)>0;
      bool equipped=true;
      if(action=="buyDecoration"){
       if(owned){detail=student.S("name")+" 已拥有："+item.Name;break;}
       await Ledger(id,-item.Price,"购买装扮："+item.Name,"decoration:"+key);
       await c.ExecuteAsync("INSERT INTO student_decorations(student_id,item_id,equipped) VALUES(@id,@item,FALSE)",new{id,item=item.Id},tx);
      }else{
       if(!owned)throw new AppError("请先购买该装扮");
       if(!b.TryGetProperty("equipped",out var value)||value.ValueKind is not (JsonValueKind.True or JsonValueKind.False))throw new AppError("请选择装备或卸下");
       equipped=value.GetBoolean();
      }
      if(equipped){
       var slots=Catalog.Decorations.Where(d=>d.Slot==item.Slot).Select(d=>d.Id).ToArray();
       await c.ExecuteAsync("UPDATE student_decorations SET equipped=FALSE WHERE student_id=@id AND item_id IN @slots",new{id,slots},tx);
      }
      await c.ExecuteAsync("UPDATE student_decorations SET equipped=@equipped WHERE student_id=@id AND item_id=@item",new{id,item=item.Id,equipped},tx);
      detail=student.S("name")+(equipped?" 装备：":" 卸下：")+item.Name;break;
     }
     case "buy":case "feed":case "interact":case "renamePet":case "changeSpecies":{
      var s=await Student(b.Get("seatId"));var id=s.S("id");
      if(action=="renamePet"){var name=Text(b.Get("name"),20);await c.ExecuteAsync("UPDATE students SET pet_name=@name WHERE id=@id",new{id,name},tx);detail=s.S("name")+" 修改伙伴名";break;}
      if(action=="changeSpecies"){var sp=Catalog.Species.FirstOrDefault(x=>x.Id==b.Get("species"))??throw new AppError("请选择伙伴");await c.ExecuteAsync("UPDATE students SET species=@species,pet_name=@name WHERE id=@id",new{id,species=sp.Id,name=sp.Name},tx);detail=s.S("name")+" 选择伙伴："+sp.Name;break;}
      if(action=="interact"){await c.ExecuteAsync("UPDATE students SET mood=LEAST(100,mood+2) WHERE id=@id",new{id},tx);detail=s.S("name")+" 与伙伴互动";break;}
      var p=Catalog.Products.FirstOrDefault(x=>x.Id==b.Get("item"))??throw new AppError("商品不存在");
      if(action=="buy"){await Ledger(id,-p.Price,"购买："+p.Name,"buy:"+key);await c.ExecuteAsync("INSERT INTO inventory(student_id,item_id,quantity) VALUES(@id,@item,1) ON DUPLICATE KEY UPDATE quantity=quantity+1",new{id,item=p.Id},tx);detail=s.S("name")+" 购买："+p.Name;}else{var changed=await c.ExecuteAsync("UPDATE inventory SET quantity=quantity-1 WHERE student_id=@id AND item_id=@item AND quantity>0",new{id,item=p.Id},tx);if(changed!=1)throw new AppError("背包里没有该道具");await c.ExecuteAsync("UPDATE students SET experience=experience+@xp,energy=LEAST(100,energy+@energy),mood=LEAST(100,mood+@mood) WHERE id=@id",new{id,xp=p.Xp,energy=p.Energy,mood=p.Mood},tx);detail=s.S("name")+" 使用："+p.Name;}break;
     }
     default:throw new AppError("未知操作");
    }
   }
   var json=JsonSerializer.SerializeToElement(result);await c.ExecuteAsync("UPDATE operations SET class_id=@classId,detail=@detail,result_json=@result WHERE teacher_id=@teacherId AND request_key=@key",new{classId,detail,result=json.GetRawText(),teacherId,key},tx);await tx.CommitAsync();return json;
  }catch(MySqlException ex)when(ex.Number==1062){await tx.RollbackAsync();var old=await Database.One(c,"SELECT request_hash,result_json,class_id FROM operations WHERE teacher_id=@teacherId AND request_key=@key",new{teacherId,key});if(old!=null&&old.S("request_hash")==bodyHash){if(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM classrooms WHERE id=@id AND "+Access,new{id=old.S("class_id"),teacherId})==0)throw new AppError("无权访问该班级",403);return JsonDocument.Parse(old.S("result_json")).RootElement.Clone();}throw new AppError("请求编号已使用，请刷新后重试",409);
  }catch{await tx.RollbackAsync();throw;}
 }
}
