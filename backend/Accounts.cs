using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using Dapper;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using MySqlConnector;
using static ClassPet.Input;
namespace ClassPet;
public sealed class Accounts(Database database){
 private readonly PasswordHasher<string> hasher=new(Options.Create(new PasswordHasherOptions{IterationCount=210000}));
 public static string TeacherId(ClaimsPrincipal user)=>user.FindFirstValue(ClaimTypes.NameIdentifier)??throw new AppError("请先登录老师账号",401);
 public async Task Validate(CookieValidatePrincipalContext context){var user=context.Principal!;var id=user.FindFirstValue(ClaimTypes.NameIdentifier);var session=user.FindFirstValue("session");var stamp=user.FindFirstValue("stamp");if(id==null||session==null){context.RejectPrincipal();return;}await using var c=database.Open();await c.OpenAsync();var count=await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM sessions s JOIN teachers t ON t.id=s.teacher_id WHERE s.token_hash=@hash AND s.teacher_id=@id AND s.expires_at>UTC_TIMESTAMP(6) AND t.security_stamp=@stamp",new{hash=Hash(session),id,stamp});if(count==0){context.RejectPrincipal();await context.HttpContext.SignOutAsync();}}
 public async Task<object> Act(HttpContext context,JsonElement b){
  var action=b.Get("action");await using var c=database.Open();await c.OpenAsync();
  if(action=="logout"){var sid=context.User.FindFirstValue("session");if(sid!=null)await c.ExecuteAsync("DELETE FROM sessions WHERE token_hash=@hash",new{hash=Hash(sid)});await context.SignOutAsync();return new{ok=true};}
  if(action=="changePassword"){
   var id=TeacherId(context.User);var row=await Database.One(c,"SELECT * FROM teachers WHERE id=@id",new{id})??throw new AppError("账号不存在",401);var current=b.Get("currentPassword");if(current.Length>128||hasher.VerifyHashedPassword(id,row.S("password_hash"),current)==PasswordVerificationResult.Failed)throw new AppError("当前密码不正确",401);var hash=hasher.HashPassword(id,Password(b.Get("password")));var stamp=Id();await using var tx=await c.BeginTransactionAsync();await c.ExecuteAsync("UPDATE teachers SET password_hash=@hash,security_stamp=@stamp WHERE id=@id",new{hash,stamp,id},tx);await c.ExecuteAsync("DELETE FROM sessions WHERE teacher_id=@id",new{id},tx);await tx.CommitAsync();row["security_stamp"]=stamp;await SignIn(context,c,row);return new{ok=true};
  }
  if(action is not("register" or "login"))throw new AppError("未知账号操作");var username=NormalName(b.Get("username"));var password=b.Get("password");if(password.Length>128)throw new AppError("密码过长");Dictionary<string,object?> teacher;
  if(action=="register"){
   if(context.User.Identity?.IsAuthenticated==true)throw new AppError("请先退出当前老师账号再注册");password=Password(password);var id=Id();var hash=hasher.HashPassword(id,password);var stamp=Id();try{await c.ExecuteAsync("INSERT INTO teachers(id,username,normalized_name,password_hash,security_stamp,created_at) VALUES(@id,@username,@username,@hash,@stamp,UTC_TIMESTAMP(6))",new{id,username,hash,stamp});}catch(MySqlException e)when(e.Number==1062){throw new AppError("用户名已被使用");}teacher=new(){{"id",id},{"username",username},{"security_stamp",stamp}};
  }else{
   var found=await Database.One(c,"SELECT * FROM teachers WHERE normalized_name=@username",new{username});
   if(found==null){_ = hasher.HashPassword("dummy",password);throw new AppError("用户名或密码不正确",401);}var check=hasher.VerifyHashedPassword(found.S("id"),found.S("password_hash"),password);if(check==PasswordVerificationResult.Failed)throw new AppError("用户名或密码不正确",401);teacher=found;
   if(check==PasswordVerificationResult.SuccessRehashNeeded)await c.ExecuteAsync("UPDATE teachers SET password_hash=@hash WHERE id=@id",new{id=found.S("id"),hash=hasher.HashPassword(found.S("id"),password)});
  }
  await SignIn(context,c,teacher);return new{ok=true};
 }
 private static async Task SignIn(HttpContext context,MySqlConnection c,Dictionary<string,object?> teacher){var token=Convert.ToHexStringLower(RandomNumberGenerator.GetBytes(32));var id=teacher.S("id");var until=DateTime.UtcNow.AddDays(30);await c.ExecuteAsync("DELETE FROM sessions WHERE expires_at<UTC_TIMESTAMP(6)");await c.ExecuteAsync("INSERT INTO sessions(token_hash,teacher_id,expires_at) VALUES(@hash,@id,@until)",new{hash=Hash(token),id,until});var claims=new[]{new Claim(ClaimTypes.NameIdentifier,id),new Claim(ClaimTypes.Name,teacher.S("username")),new Claim("session",token),new Claim("stamp",teacher.S("security_stamp"))};await context.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,new ClaimsPrincipal(new ClaimsIdentity(claims,CookieAuthenticationDefaults.AuthenticationScheme)),new AuthenticationProperties{IsPersistent=true,ExpiresUtc=new DateTimeOffset(until),AllowRefresh=false});}
}
