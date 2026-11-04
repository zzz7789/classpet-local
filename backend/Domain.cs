using System.Text.Json;
using System.Security.Cryptography;
using System.Text;
using System.Globalization;
using System.Text.RegularExpressions;
namespace ClassPet;
public sealed class AppError(string message, int status=400):Exception(message) { public int Status {get;}=status; }
public sealed record Product(string Id,string Name,int Price,int Xp,int Energy,int Mood);
public sealed record Species(string Id,string Name,string Type,string Image);
public sealed record Decoration(string Id,string Name,int Price,string Slot,string Image);
public static class Catalog {
 public static readonly Decoration[] Decorations=[new("bed","云朵小床",80,"bed","/decor/bed.webp"),new("rug","花花地毯",40,"rug","/decor/rug.webp"),new("plant","小雏菊盆栽",30,"plant","/decor/plant.webp"),new("scarf","薄荷小围巾",60,"accessory","/decor/scarf.webp")];
 public static readonly Product[] Products=[new("cookie","香脆饼干",10,5,10,5),new("apple","清甜苹果",15,8,15,5),new("milk","营养牛奶",20,12,25,8),new("cake","草莓蛋糕",50,35,20,15),new("meal","营养餐",80,55,50,20),new("ball","软软玩具球",30,15,0,20)];
 public static readonly Species[] Species=[
  new("electric","暖暖金毛","陪伴","/pets/partner.webp"),
  new("fire","团团小熊猫","森林","/pets/fire.webp"),
  new("water","泡泡海龟","水边","/pets/water.webp"),
  new("leaf-rabbit","芽芽兔","花园","/pets/leaf-rabbit.webp"),
  new("moon-fox","绒绒狐","月光","/pets/moon-fox.webp"),
  new("ice-penguin","团子企鹅","冰雪","/pets/ice-penguin.webp"),
  new("star-owl","星星猫头鹰","星光","/pets/star-owl.webp"),
  new("mushroom-bear","蘑菇熊","森林","/pets/mushroom-bear.webp"),
  new("cloud-cat","奶油小猫","花园","/pets/cloud-cat.webp")
 ];
 public static (int Level,int Current,int Next) LevelInfo(int xp){int level=1;while(level<100&&xp>=20+10*(level-1)){xp-=20+10*(level-1);level++;}return(level,xp,20+10*(level-1));}
}
public static class Input {
 public static string Get(this JsonElement b,string key,string fallback="")=>b.TryGetProperty(key,out var v)&&v.ValueKind==JsonValueKind.String?v.GetString()??fallback:fallback;
 public static int Number(this JsonElement b,string key,int fallback=0)=>b.TryGetProperty(key,out var v)&&v.ValueKind==JsonValueKind.Number&&v.TryGetInt32(out var n)?n:fallback;
 public static bool Flag(this JsonElement b,string key)=>b.TryGetProperty(key,out var v)&&v.ValueKind==JsonValueKind.True;
 public static string Text(string value,int max=100){if(string.IsNullOrWhiteSpace(value)||value.Trim().Length>max)throw new AppError("请检查输入内容");return value.Trim();}
 public static string[] Ids(JsonElement b){if(!b.TryGetProperty("ids",out var list)||list.ValueKind!=JsonValueKind.Array)throw new AppError("请选择学生");var ids=list.EnumerateArray().Select(v=>v.ValueKind==JsonValueKind.String?v.GetString()!:"").Distinct().ToArray();if(ids.Length is <1 or >50||ids.Any(v=>!Guid.TryParse(v,out _)))throw new AppError("每次请选择1–50名学生");return ids;}
 public static int Range(int v,int min,int max){if(v<min||v>max)throw new AppError("数值超出允许范围");return v;}
 public static string NormalName(string name){var s=Text(name,30).Normalize(NormalizationForm.FormKC).ToLowerInvariant();if(!Regex.IsMatch(s,@"^[\p{L}\p{N}_-]{3,30}$"))throw new AppError("用户名为3–30个汉字、字母、数字或下划线");return s;}
 public static string Password(string value){if(value.Length is <8 or >128)throw new AppError("密码请填写8–128位");return value;}
 public static string Id()=>Guid.NewGuid().ToString();
 public static string Hash(string s)=>Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(s)));
 public static string S(this Dictionary<string,object?> d,string key)=>Convert.ToString(d.GetValueOrDefault(key),CultureInfo.InvariantCulture)??"";
 public static int I(this Dictionary<string,object?> d,string key)=>Convert.ToInt32(d.GetValueOrDefault(key)??0,CultureInfo.InvariantCulture);
}
