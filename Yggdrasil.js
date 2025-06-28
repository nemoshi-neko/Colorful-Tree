        // ==================================================
        // 設定 (CONFIG)
        // ==================================================
        const CONFIG = {
            FRUIT_COUNT: 50,      // 木になる実の最大数
            STAR_COUNT: 30,       // 表示される星の最大数
            CLOUD_COUNT: 5,       // 画面内に表示される雲の数

            MAX_DEPTH: 8,         // 木の枝が分岐する最大の深さ
            TRUNK_LENGTH_RATIO: 0.2, // 幹の長さ (画面の高さに対する割合)

            STAR_MIN_SIZE: 2,       // 星の最小サイズ
            STAR_MAX_SIZE: 10,       // 星の最大サイズ
            STAR_TWINKLE_SPEED: 4,  // 星のまたたきの速さ
        };

        // ==================================================
        // グローバル変数
        // ==================================================
        let angle;
        let trunkLength;
        let pastelColors = [];

        let fruits = [];
        let stars = [];
        let clouds = [];
        let particles = [];

        let activeLeafNodes = new Map(); // 葉の先端 (実がなる場所)
        let branchNodes = [];      // 枝の途中 (星が生まれる場所)
        let branchTipToFruitMap = new Map();

        // ==================================================
        // p5.js ライフサイクル関数
        // ==================================================
        function setup() {
            createCanvas(windowWidth * 0.8, windowHeight * 0.8);
            angleMode(DEGREES);
            pixelDensity(1);

            pastelColors = [
                color(255, 182, 193, 200), color(255, 223, 186, 200),
                color(255, 255, 186, 200), color(186, 255, 201, 200),
                color(186, 225, 255, 200)
            ];

            trunkLength = height * CONFIG.TRUNK_LENGTH_RATIO;
            angle = random(20, 35);

            for (let i = 0; i < CONFIG.FRUIT_COUNT; i++) fruits.push(new Fruit());
            for (let i = 0; i < CONFIG.STAR_COUNT; i++) stars.push(new Star());
            for (let i = 0; i < CONFIG.CLOUD_COUNT; i++) clouds.push(new Cloud());
        }

        function windowResized() {
            resizeCanvas(windowWidth * 0.8, windowHeight * 0.8);
            trunkLength = height * CONFIG.TRUNK_LENGTH_RATIO;
        }

        function draw() {
            // 1. 背景の描画
            drawBackground();
            drawClouds();

            // 2. 木の描画と情報の更新
            activeLeafNodes.clear();
            branchNodes = [];
            drawTree();

            // 3. 各要素の管理と描画
            manageFruits();
            manageStars();
            
            drawFruits();
            drawStars();
            drawParticles();
        }

        function mousePressed() {
            for (let i = fruits.length - 1; i >= 0; i--) {
                if (fruits[i].isClicked(mouseX, mouseY)) {
                    fruits[i].burst();
                    break;
                }
            }
        }

        // ==================================================
        // 描画ヘルパー関数
        // ==================================================
        function drawBackground() {
            let topColor = color(135, 206, 250);
            let bottomColor = color(240, 248, 255);
            for (let i = 0; i < height; i++) {
                let inter = map(i, 0, height, 0, 1);
                let c = lerpColor(topColor, bottomColor, inter);
                stroke(c);
                line(0, i, width, i);
            }
        }

        function drawTree() {
            push();
            translate(width / 2, height);
            stroke(139, 69, 19, 200);
            strokeWeight(map(mouseY, 0, height, 2, 8));
            branch(trunkLength, 0, 0);
            pop();
        }

        function branch(len, depth, branchId) {
            strokeWeight(map(depth, 0, CONFIG.MAX_DEPTH, 8, 1));
            let r = map(depth, 0, CONFIG.MAX_DEPTH, 139, 255);
            let g = map(depth, 0, CONFIG.MAX_DEPTH, 69, 220);
            let b = map(depth, 0, CONFIG.MAX_DEPTH, 19, 220);
            stroke(r, g, b, 200);

            line(0, 0, 0, -len);
            translate(0, -len);

            if (depth > 2) {
                branchNodes.push(applyMatrixVector(createVector(0, 0)));
            }

            len *= 0.75;
            depth++;

            if (len > 6 && depth < CONFIG.MAX_DEPTH) {
                push();
                rotate(angle + sin(frameCount * 0.2 + depth * 15) * 4);
                branch(len, depth, branchId * 2 + 1);
                pop();

                push();
                rotate(-angle + cos(frameCount * 0.2 + depth * 15) * 4);
                branch(len, depth, branchId * 2 + 2);
                pop();
            } else if (depth >= CONFIG.MAX_DEPTH) {
                activeLeafNodes.set(branchId, applyMatrixVector(createVector(0, 0)));
            }
        }

        // ==================================================
        // 要素の管理 (Manage) & 描画 (Draw)
        // ==================================================

        function manageFruits() {
            let visibleFruitCount = [...branchTipToFruitMap.values()].length;

            fruits.forEach((fruit, index) => {
                if (fruit.visible) {
                    fruit.update();
                    let associatedBranchId = [...branchTipToFruitMap.entries()].find(([key, value]) => value === index)?.[0];
                    if (associatedBranchId && activeLeafNodes.has(associatedBranchId)) {
                        let leafPos = activeLeafNodes.get(associatedBranchId);
                        fruit.x = leafPos.x;
                        fruit.y = leafPos.y;
                    } else if (associatedBranchId) {
                        fruit.visible = false;
                        branchTipToFruitMap.delete(associatedBranchId);
                    }
                } else if (fruit.cooldown > 0) {
                    fruit.cooldown--;
                }
            });

            if (visibleFruitCount < CONFIG.FRUIT_COUNT) {
                let unoccupiedBranchIds = [...activeLeafNodes.keys()].filter(id => ![...branchTipToFruitMap.keys()].includes(id));
                if (unoccupiedBranchIds.length > 0) {
                    let availableFruitIndex = fruits.findIndex(f => !f.visible && f.cooldown <= 0);
                    if (availableFruitIndex !== -1) {
                        let branchId = random(unoccupiedBranchIds);
                        let pos = activeLeafNodes.get(branchId);
                        fruits[availableFruitIndex].spawn(pos.x, pos.y);
                        branchTipToFruitMap.set(branchId, availableFruitIndex);
                    }
                }
            }
        }
        function drawFruits() { fruits.forEach(f => f.visible && f.draw()); }

        function manageStars() {
            let visibleStarCount = stars.filter(s => s.visible).length;

            stars.forEach(star => {
                if (star.visible) {
                    star.update();
                } else if (star.cooldown > 0) {
                    star.cooldown--;
                }
            });

            if (visibleStarCount < CONFIG.STAR_COUNT && branchNodes.length > 0) {
                let availableStar = stars.find(s => !s.visible && s.cooldown <= 0);
                if (availableStar) {
                    let spawnPos = random(branchNodes);
                    availableStar.spawn(spawnPos.x, spawnPos.y);
                }
            }
        }
        function drawStars() { stars.forEach(s => s.visible && s.draw()); }

        function drawClouds() { clouds.forEach(c => { c.move(); c.draw(); }); }
        function drawParticles() { for (let i = particles.length - 1; i >= 0; i--) { particles[i].update(); particles[i].draw(); if (particles[i].isFinished()) particles.splice(i, 1); } }

        // ==================================================
        // クラス定義 (Classes)
        // ==================================================

        class Fruit {
            constructor() {
                this.x = 0; this.y = 0;
                this.visible = false;
                this.baseSize = random(10, 22);
                this.targetSize = 0; this.currentSize = 0;
                this.color = random(pastelColors);
                this.growSpeed = random(0.05, 0.1);
                this.lifespan = 0; this.maxLifespan = random(600, 1200);
                this.cooldown = 0;
            }

            spawn(x, y) {
                this.x = x; this.y = y;
                this.visible = true;
                this.currentSize = 0; this.targetSize = this.baseSize;
                this.lifespan = 0; this.maxLifespan = random(600, 1200);
                this.color = random(pastelColors);
            }

            update() {
                this.lifespan++;
                if (this.lifespan > this.maxLifespan) {
                    this.visible = false;
                    this.cooldown = 120;
                    let associatedBranchId = [...branchTipToFruitMap.entries()].find(([key, value]) => value === fruits.indexOf(this))?.[0];
                    if(associatedBranchId) branchTipToFruitMap.delete(associatedBranchId);
                }
            }

            draw() {
                this.currentSize = lerp(this.currentSize, this.targetSize, this.growSpeed);
                let d = dist(mouseX, mouseY, this.x, this.y);

                if (d < this.currentSize / 2 + 10) {
                    this.targetSize = this.baseSize * 1.5;
                    fill(255, 182, 193, 255);
                    stroke(255, 255, 255, 200);
                    strokeWeight(3);
                } else {
                    this.targetSize = this.baseSize;
                    fill(this.color);
                    noStroke();
                }
                
                ellipse(this.x, this.y, this.currentSize, this.currentSize);

                for (let j = 0; j < 3; j++) {
                    fill(255, 255, 255, 80 - j * 25);
                    ellipse(this.x, this.y, this.currentSize * (0.7 + j * 0.1), this.currentSize * (0.7 + j * 0.1));
                }
            }
            
            isClicked(mx, my) {
                return this.visible && dist(mx, my, this.x, this.y) < this.currentSize / 2 + 10;
            }

            burst() {
                for (let j = 0; j < 20; j++) {
                    particles.push(new Particle(this.x, this.y, this.color));
                }
                this.visible = false;
                this.cooldown = 120;
                let associatedBranchId = [...branchTipToFruitMap.entries()].find(([key, value]) => value === fruits.indexOf(this))?.[0];
                if(associatedBranchId) branchTipToFruitMap.delete(associatedBranchId);
            }
        }

        class Star {
            constructor() {
                this.x = 0; this.y = 0;
                this.size = 0;
                this.angle = 0;
                this.visible = false;
                this.lifespan = 0;
                this.maxLifespan = 0;
                this.cooldown = 0;
            }

            spawn(x, y) {
                this.x = x;
                this.y = y;
                this.size = random(CONFIG.STAR_MIN_SIZE, CONFIG.STAR_MAX_SIZE);
                this.angle = random(360);
                this.visible = true;
                this.lifespan = 0;
                this.maxLifespan = random(180, 300); // 3〜5秒で消える
            }

            update() {
                this.lifespan++;
                if (this.lifespan > this.maxLifespan) {
                    this.visible = false;
                    this.cooldown = random(120, 300); // 再出現までのクールダウン
                }
            }

            draw() {
                let brightness = 150 + 105 * sin(frameCount * CONFIG.STAR_TWINKLE_SPEED + this.x);

                push();
                translate(this.x, this.y);
                rotate(this.angle);
                
                drawingContext.filter = 'blur(4px)';
                fill(255, 255, 220, brightness / 2);
                this.drawStarShape(this.size * 1.5);
                
                drawingContext.filter = 'none';
                fill(255, 255, 220, brightness);
                this.drawStarShape(this.size);
                
                pop();
            }

            drawStarShape(size) {
                noStroke();
                beginShape();
                for (let i = 0; i < 5; i++) {
                    let angle = -90 + i * 72;
                    vertex(cos(angle) * size, sin(angle) * size);
                    angle += 36;
                    vertex(cos(angle) * (size / 2), sin(angle) * (size / 2));
                }
                endShape(CLOSE);
            }
        }

        class Cloud {
            constructor() {
                this.x = random(-width, width);
                this.y = random(height * 0.1, height * 0.6);
                this.speed = random(0.2, 0.8);
                this.size = random(50, 150);
                this.ellipses = [];
                for (let i = 0; i < 5; i++) {
                    this.ellipses.push({
                        x_offset: i * (this.size / 5),
                        y_offset: random(-5, 5),
                        w: this.size / 2,
                        h: this.size / 3
                    });
                }
            }

            move() {
                this.x += this.speed;
                if (this.x > width + this.size) {
                    this.x = -this.size;
                }
            }

            draw() {
                fill(255, 255, 255, 150);
                noStroke();
                this.ellipses.forEach(e => {
                    ellipse(this.x + e.x_offset, this.y + e.y_offset, e.w, e.h);
                });
            }
        }

        class Particle {
            constructor(x, y, fruitColor) {
                this.x = x;
                this.y = y;
                this.vx = random(-2, 2);
                this.vy = random(-2, 2);
                this.alpha = 255;
                this.size = random(3, 7);
                this.color = fruitColor;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.alpha -= 5;
            }

            isFinished() {
                return this.alpha < 0;
            }

            draw() {
                noStroke();
                fill(red(this.color), green(this.color), blue(this.color), this.alpha);
                ellipse(this.x, this.y, this.size, this.size);
            }
        }

        // ==================================================
        // ユーティリティ
        // ==================================================
        function applyMatrixVector(v) {
            let m = drawingContext.getTransform();
            return createVector(v.x * m.a + v.y * m.c + m.e, v.x * m.b + v.y * m.d + m.f);
        }