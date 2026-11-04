using Dapper;
using MySqlConnector;
namespace ClassPet;
public sealed class Database(IConfiguration config){
 public MySqlConnection Open()=>new(config.GetConnectionString("Default")??throw new InvalidOperationException("缺少 MySQL 连接串 ConnectionStrings__Default"));
 public async Task Initialize(){await using var c=Open();await c.OpenAsync();var file=Path.Combine(AppContext.BaseDirectory,"Database","schema.sql");await c.ExecuteAsync(await File.ReadAllTextAsync(file));}
 public static async Task<List<Dictionary<string,object?>>> Rows(MySqlConnection c,string sql,object? args=null,MySqlTransaction? tx=null){var rows=await c.QueryAsync(sql,args,tx);return rows.Select(r=>((IDictionary<string,object>)r).ToDictionary(p=>p.Key,p=>p.Value is DateTime dt?(object?)DateTime.SpecifyKind(dt,DateTimeKind.Utc):p.Value)).ToList();}
 public static async Task<Dictionary<string,object?>?> One(MySqlConnection c,string sql,object? args=null,MySqlTransaction? tx=null)=>(await Rows(c,sql,args,tx)).FirstOrDefault();
}
