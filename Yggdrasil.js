let angle; // 枝の分岐角度
        let trunkLength; // 幹の初期の長さ
        let fruits = []; // 実の情報を格納する配列
        let particles = []; // パーティクルの配列
        let stars = []; // 星の配列
        let clouds = []; // 雲の配列
        const FRUIT_COUNT = 50; // 実の総数
        const MAX_DEPTH = 8; // 再帰の最大深度 (木の複雑さ)
        let pastelColors = []; // パステルカラーの配列

        // グローバルマップ
        let branchTipToFruitMap = new Map();
        let activeLeafNodes = new Map();

        // P5.jsのセットアップ関数
        function setup() {
            createCanvas(windowWidth * 0.8, windowHeight * 0.8);
            angleMode(DEGREES);
            pixelDensity(1);
            
            pastelColors = [
                color(255, 182, 193, 200), color(255, 223, 186, 200),
                color(255, 255, 186, 200), color(186, 255, 201, 200),
                color(186, 225, 255, 200)
            ];

            trunkLength = height * 0.2;
            angle = random(20, 35);

            for (let i = 0; i < FRUIT_COUNT; i++) {
                fruits.push(new Fruit());
            }
            
            // 雲の初期化
            for (let i = 0; i < 5; i++) {
                clouds.push(new Cloud());
            }
        }

        function windowResized() {
            resizeCanvas(windowWidth * 0.8, windowHeight * 0.8);
            trunkLength = height * 0.2;
        }

        // P5.jsの描画ループ関数
        function draw() {
            // 背景のグラデーション
            let topColor = color(135, 206, 250); // 明るい空色
            let bottomColor = color(240, 248, 255); // ほとんど白
            setGradient(0, 0, width, height, topColor, bottomColor);

            drawClouds();
            
            stars = []; // 星の配列を毎フレームクリア
            activeLeafNodes.clear();

            push();
            translate(width / 2, height);
            stroke(139, 69, 19, 200);
            strokeWeight(map(mouseY, 0, height, 2, 8));
            branch(trunkLength, 0, 0);
            pop();

            stars.forEach(star => star.draw()); // 星を描画

            manageFruits();
            drawFruits();
            drawParticles();
        }
        
        // グラデーションを描画する関数
        function setGradient(x, y, w, h, c1, c2) {
            noFill();
            for (let i = y; i <= y + h; i++) {
                let inter = map(i, y, y + h, 0, 1);
                let c = lerpColor(c1, c2, inter);
                stroke(c);
                line(x, i, x + w, i);
            }
        }

        // 雲を描画する関数
        function drawClouds() {
            clouds.forEach(cloud => {
                cloud.move();
                cloud.draw();
            });
        }

        // 枝を再帰的に描画する関数
        function branch(len, depth, branchId) {
            strokeWeight(map(depth, 0, MAX_DEPTH, 8, 1));
            let r = map(depth, 0, MAX_DEPTH, 139, 255);
            let g = map(depth, 0, MAX_DEPTH, 69, 220);
            let b = map(depth, 0, MAX_DEPTH, 19, 220);
            stroke(r, g, b, 200);

            line(0, 0, 0, -len);
            translate(0, -len);

            // 枝の途中に星を追加
            if (random() > 0.95 && depth > 2) {
                stars.push(new Star(0, 0));
            }

            len *= 0.75;
            depth++;

            if (len > 6 && depth < MAX_DEPTH) {
                push();
                rotate(angle + sin(frameCount * 0.2 + depth * 15) * 4);
                branch(len, depth, branchId * 2 + 1);
                pop();

                push();
                rotate(-angle + cos(frameCount * 0.2 + depth * 15) * 4);
                branch(len, depth, branchId * 2 + 2);
                pop();
            } else if (depth >= MAX_DEPTH) {
                let branchTipPos = applyMatrixVector(createVector(0, 0));
                activeLeafNodes.set(branchId, { x: branchTipPos.x, y: branchTipPos.y });
            }
        }

        // 実の管理
        function manageFruits() {
            // ... (既存のロジックをFruitクラスに移動)
        }

        // 実を描画
        function drawFruits() {
            fruits.forEach(fruit => {
                if (fruit.visible) {
                    fruit.draw();
                }
            });
        }
        
        // パーティクルを描画
        function drawParticles() {
            for (let i = particles.length - 1; i >= 0; i--) {
                particles[i].update();
                particles[i].draw();
                if (particles[i].isFinished()) {
                    particles.splice(i, 1);
                }
            }
        }

        // マウスクリック時のイベント
        function mousePressed() {
            for (let i = 0; i < fruits.length; i++) {
                let fruit = fruits[i];
                if (fruit.isClicked(mouseX, mouseY)) {
                    // パーティクルを生成
                    for (let j = 0; j < 20; j++) {
                        particles.push(new Particle(fruit.x, fruit.y, fruit.color));
                    }
                    fruit.visible = false; // 実を消す
                    let associatedBranchId = [...branchTipToFruitMap.entries()]
                        .find(([key, value]) => value === i)?.[0];
                    if(associatedBranchId) branchTipToFruitMap.delete(associatedBranchId);
                    break;
                }
            }
        }
        
        // Fruitクラス
        class Fruit {
            constructor() {
                this.x = 0;
                this.y = 0;
                this.baseSize = random(10, 22);
                this.targetSize = 0;
                this.currentSize = 0;
                this.color = random(pastelColors);
                this.growSpeed = random(0.05, 0.1);
                this.visible = false;
                this.lifespan = 0;
                this.maxLifespan = random(600, 1200);
                this.cooldown = 0;
            }

            draw() {
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
                
                this.currentSize = lerp(this.currentSize, this.targetSize, this.growSpeed);
                ellipse(this.x, this.y, this.currentSize, this.currentSize);

                for (let j = 0; j < 3; j++) {
                    fill(255, 255, 255, 80 - j * 25);
                    ellipse(this.x, this.y, this.currentSize * (0.7 + j * 0.1), this.currentSize * (0.7 + j * 0.1));
                }
            }
            
            isClicked(mx, my) {
                if (!this.visible) return false;
                return dist(mx, my, this.x, this.y) < this.currentSize / 2 + 10;
            }
        }
        
        // Particleクラス
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
        
        // Starクラス
        class Star {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.size = random(1, 3);
                this.brightness = random(150, 255);
            }

            draw() {
                fill(255, 255, 200, this.brightness * abs(sin(frameCount * 0.1)));
                noStroke();
                ellipse(this.x, this.y, this.size, this.size);
            }
        }

        // Cloudクラス
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

        function applyMatrixVector(v) {
            let m = drawingContext.getTransform();
            return createVector(v.x * m.a + v.y * m.c + m.e, v.x * m.b + v.y * m.d + m.f);
        }

        function manageFruits() {
            let fruitIndexToBranchTipMap = new Map();
            for (let [branchId, fruitIndex] of branchTipToFruitMap.entries()) {
                fruitIndexToBranchTipMap.set(fruitIndex, branchId);
            }

            for (let i = 0; i < fruits.length; i++) {
                let fruit = fruits[i];
                if (fruit.visible) {
                    fruit.lifespan++;
                    if (fruit.lifespan > fruit.maxLifespan) {
                        fruit.visible = false;
                        let associatedBranchId = fruitIndexToBranchTipMap.get(i);
                        if (associatedBranchId !== undefined) {
                            branchTipToFruitMap.delete(associatedBranchId);
                        }
                    }
                    let associatedBranchId = fruitIndexToBranchTipMap.get(i);
                    if (associatedBranchId !== undefined && activeLeafNodes.has(associatedBranchId)) {
                        let leafPos = activeLeafNodes.get(associatedBranchId);
                        fruit.x = leafPos.x;
                        fruit.y = leafPos.y;
                    } else if (associatedBranchId !== undefined) {
                        fruit.visible = false;
                    }
                } else {
                    if (fruit.cooldown > 0) {
                        fruit.cooldown--;
                    }
                }
            }

            let currentVisibleFruitCount = Array.from(branchTipToFruitMap.values()).length;
            if (currentVisibleFruitCount >= FRUIT_COUNT) return;

            let availableFruitIndices = [];
            for (let i = 0; i < FRUIT_COUNT; i++) {
                if (!fruits[i].visible && fruits[i].cooldown <= 0) {
                    availableFruitIndices.push(i);
                }
            }

            let occupiedBranchIds = new Set(branchTipToFruitMap.keys());
            let unoccupiedBranchIds = [];
            for (let branchId of activeLeafNodes.keys()) {
                if (!occupiedBranchIds.has(branchId)) {
                    unoccupiedBranchIds.push(branchId);
                }
            }

            while (currentVisibleFruitCount < FRUIT_COUNT && availableFruitIndices.length > 0 && unoccupiedBranchIds.length > 0) {
                let randomFruitPoolIndex = floor(random(availableFruitIndices.length));
                let selectedFruitIndex = availableFruitIndices.splice(randomFruitPoolIndex, 1)[0];
                let randomBranchPoolIndex = floor(random(unoccupiedBranchIds.length));
                let selectedBranchId = unoccupiedBranchIds.splice(randomBranchPoolIndex, 1)[0];
                let fruitToSpawn = fruits[selectedFruitIndex];
                let branchPos = activeLeafNodes.get(selectedBranchId);

                if (branchPos) {
                    branchTipToFruitMap.set(selectedBranchId, selectedFruitIndex);
                    fruitToSpawn.x = branchPos.x;
                    fruitToSpawn.y = branchPos.y;
                    fruitToSpawn.visible = true;
                    fruitToSpawn.targetSize = fruitToSpawn.baseSize;
                    fruitToSpawn.currentSize = 0;
                    fruitToSpawn.lifespan = 0;
                    fruitToSpawn.maxLifespan = random(400, 600);
                    fruitToSpawn.cooldown = 0;
                    currentVisibleFruitCount++;
                }
            }
        }