# 萌宠图片资产（2026-10-23）

使用内置 imagegen，以用户认可的小猫图为风格参考，每只宠物单独生成。未使用 CLI/API fallback。

原始高清 PNG：本目录。网页 WebP：../../frontend/public/pets/，768×768、质量88。只做尺寸与格式优化，未重绘内容。

共用提示词：Generate one new standalone square raster pet portrait matching the approved kitten image as a STYLE REFERENCE ONLY. Premium soft 2.5D cartoon game illustration, adorable plush textures, round oversized head, sparkling expressive eyes, subtle pink cheeks, gentle joyful expression, warm sunlit pastel garden with daisies and blurred greenery. Full animal body including ears, feet and tail visible, centered sitting pose occupying 80% of image, easy to recognize at thumbnail size. Painterly soft rendered volume and fine fur/feathers texture rather than vector outlines. Original familiar animal for a children's classroom pet nurturing game, not Pokemon or any franchise. No additional animals, text, labels, UI, collage or watermarks. Cohesive with reference lighting and palette.

单独主体提示词：
- partner：baby golden retriever puppy, floppy ears, golden cream fur
- fire：baby red panda, warm reddish orange fur and fluffy ringed tail
- water：baby turtle, soft mint green skin and rounded teal shell
- leaf-rabbit：baby white rabbit, long soft ears and tiny green leaf accessory
- moon-fox：baby arctic fox, cream lavender white fluffy fur, enormous soft tail
- ice-penguin：baby penguin, fluffy gray and white down, tiny blue scarf
- star-owl：baby owl, round caramel and cream feathers, tiny wings
- mushroom-bear：baby brown bear cub, fluffy caramel fur and tiny mushroom hat
- cloud-cat：沿用用户批准的 cream-and-apricot baby kitten, mint leaf neckerchief 原图。

保留原物种内部 ID，避免影响既有学生和成长数据；目录名称与图片更新。旧版前三种默认宠物名在界面显示为新的动物名称，不修改数据库里的自定义宠物名。食物道具与背景的 SVG 不属于宠物肖像替换范围。
