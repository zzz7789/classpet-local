# 萌宠动作素材

2026-10-23。使用内置 imagegen，以 `docs/pet-art/{id}.png` 为角色身份与画风参考，每只宠物单独生成一张透明 3×3 动作表。原始 PNG 在本目录，网页动作表在 `frontend/public/pets/motion/{id}.webp`。

## 动作布局

每张网页动作表 1536×1536，九格各 512×512：

- 第一行：待机睁眼、眨眼、轻呼吸。
- 第二行：低头张嘴、咀嚼、舔嘴满足。
- 第三行：注意回应、抬爪/鳍/翅膀、开心挥动。

WebP 保留透明 alpha，花园由页面独立显示，不在动作图中。`scripts/pack-pet-motion.py` 根据透明间隙提取原始九格，以统一缩放、中心及底边留白打包；不合成或重绘宠物姿态。

## 生成提示词

Use case: stylized-concept. Create ONE production animation sprite sheet of the EXACT same character shown in reference. Reference is character identity and rendering style. Preserve colors, facial features, proportions, accessories, premium warm soft 2.5D plush cartoon rendering. This is NOT a scene illustration. STRICT square canvas divided into a perfectly regular 3 COLUMN by 3 ROW grid, NINE equal square invisible cells, each cell contains ONE full-body same character, transparent background, absolutely NO garden or background. All nine poses same scale, feet baseline, centered position and camera, comfortable padding so ears/tail never cross cell boundary. Every cell's character visible fully and separately. No grid lines, labels, letters, borders or text. Row 1 LEFT to RIGHT is IDLE animation: neutral happy sitting eyes open; same pose eyes closed blinking; same pose eyes open tiny breathing chest rise and slight tail change. Row 2 is EATING: head bent gently down and mouth open; head still slightly down eyes relaxed mouth closed chewing with plump cheeks; head lifted slightly mouth licking lips contentedly. Row 3 is INTERACTION: attentive face leaning forward slightly; one front paw or flipper/wing lifted in a friendly wave and smiling; same lifted appendage waving slightly farther, eyes happily closed. For turtle keep shell consistent, penguin flipper and owl wing instead of paw. Animate ONLY character anatomy naturally, not whole portrait distortion. No food or toys. No extra characters. Transparent alpha for all empty spaces and entire background. Soft subtle contact shadow permissible. EXACTLY THREE rows and THREE columns, no additional frames.

主体约束：partner 为戴叶子围巾的金毛；fire 为小熊猫；water 为薄荷绿海龟；leaf-rabbit 为白兔；moon-fox 为浅紫白狐；ice-penguin 为蓝围巾灰白企鹅；star-owl 为焦糖奶油色猫头鹰；mushroom-bear 为蘑菇帽小熊；cloud-cat 为叶子围巾奶油橘猫。

## 页面行为

班级卡使用首格静态展示，只有点开的伙伴档案播放动作。档案待机慢眨眼；成功使用食物后播放进食，玩球/互动/奖励后播放回应；反馈结束恢复待机。重复操作重置帧。减少动态模式保持首格；离屏或页面隐藏暂停计时。图片加载失败显示原肖像，组件以 `data-asset-state` 和 `data-sheet` 暴露可诊断状态。

学生、物种 ID、经验、库存及 API 规则均未变更。登录、选择宠物等展示图片保留原静态肖像。
