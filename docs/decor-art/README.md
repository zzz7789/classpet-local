# 成长与小窝（2026-10-24）

- 幼年 Lv.1–2；成长 Lv.3–5（星星胸章）；成熟 Lv.6及以上（小皇冠）。三个阶段逐渐增大体型，沿用宠物身份和毛绒画风。经验仍通过使用补给获得，加分及购买装扮不直接改变经验。
- 小窝：云朵小床80积分、花花地毯40积分、小雏菊盆栽30积分、薄荷小围巾60积分。购买自动布置，永久拥有；收起、重新布置免费，同槽装备互斥。
- 新增student_decorations表，启动自动创建；后台决定价格、检查权限和余额，购买使用事务及既有幂等机制。既有学生和数据保留，班级导出包含装扮。
- 点开档案后，不同物种以不同节奏偶尔挥爪/鳍/翅膀回应，操作动作优先，结束回到待机。列表始终静止，隐藏/离屏/减少动态时停止多余计时。

## 素材

本目录保留原始PNG，网页资源在frontend/public/decor/；使用内置imagegen，每件单独生成透明素材。sources.json记录每件主体提示词与原始生成路径。
共用提示词：Use case: stylized-concept. Asset for the same children's plush pet nurturing game as the reference. Reference kitten image is STYLE ONLY: premium softly painted 2.5D cartoon, soft warm sunlight, cream and mint colors, round cozy forms, tactile texture. Single centered complete object, full silhouette with comfortable padding, genuinely transparent alpha background. No animals, no people, no garden, no letters, no numbers, no labels, no watermark. This must be a raster game furnishing or accessory illustration, not vector or SVG. Match the reference polish.

## 验证

后端构建、schema双份一致、独立账号API测试（定价、积分不足、并发/幂等、授权、导出）、重启持久化、真实隔离账号购买/卸下/重装备浏览器验证通过。
前端单测、成长门槛与个性序列单测、喂食/抽答/减少动态回归、桌面手机截图检查通过。
测试使用独立账号和班级，未选择或修改真实学生。升级前数据备份在backups/before-growth-home-*.sql。
