# 食物、道具与花园素材

2026-10-23，使用内置 imagegen 生成，以已批准的毛绒小猫图作为画风参考。每个物品单独生成，未使用 CLI fallback。

原始 PNG 在本目录；网页资源在 `frontend/public/items/*.webp`（512×512，保留透明 alpha）及 `frontend/public/backgrounds/garden.webp`（1600×900）。格式转换仅缩放压缩，不重绘内容。

共同提示词：Use case: stylized-concept. Asset for a children's classroom pet nurturing game. Use the supplied kitten image as a STYLE REFERENCE ONLY for warm painterly 2.5D cartoon rendering, softly textured materials, rounded friendly forms, soft golden sunlight, mint and cream pastel colors and premium polish. No kitten, no animal, no people, no UI, no letters, no numbers, no brand logo, no watermark. Render as a rich raster illustration, NOT flat vector, NOT SVG, NOT pixel art.

物品附加要求：Single isolated game inventory asset, centered full object visible with comfortable padding, readable silhouette at small sizes, subtle contact shadow only, genuinely transparent alpha background, no garden scene or square backdrop. Square composition.

各图主体提示词：

- cookie: a small shallow cream ceramic bowl filled with round golden baked pet kibble biscuits, tiny paw motif embossed on bowl, no writing
- apple: one fresh rosy red apple with a little green leaf and a single neat apple wedge beside it, wholesome snack
- milk: one rounded little glass bottle of milk with a mint green lid and a tiny cream ceramic drinking bowl beside it, no writing or label
- cake: one small soft strawberry sponge cupcake in a pastel paper cup, cream frosting and one strawberry, no writing
- meal: one small rounded cream ceramic feeding bowl with neatly separated cooked fish pieces, carrot cubes and green peas, wholesome cooked pet meal, no raw food
- ball: one soft plush play ball, pastel mint green and warm peach fabric panels, soft stitched seams, appealing tactile texture, no writing
- garden: an empty sunlit storybook garden with a softly rolling grassy clearing, tiny daisies and clover at the edges, leafy tree canopy in upper corners, distant cream cottage and white picket fence softly blurred, open calm grassy area through center for game overlays. Wide landscape composition, NO animals, NO characters, NO objects in the center. Landscape backdrop, polished soft depth and warm welcoming atmosphere, no transparent areas.

旧 SVG 已归档到 `docs/legacy-svg/`，不再通过前端 public 发布。保留商品内部 ID、价格、成长数值和库存逻辑；更新名称及视觉反馈。吃、喝、玩、盛碗供应分别反馈，完整宠物肖像保持静止；减少动态偏好下显示静态结果。
