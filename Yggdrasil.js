// --- 設定 ---
        const STAR_COUNT = 30; // 星の最大数
        const STAR_MIN_SIZE = 2; // 星の最小サイズ
        const STAR_MAX_SIZE = 5; // 星の最大サイズ
        const STAR_TWINKLE_SPEED = 3; // 星のまたたきの速さ

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
        let branchNodes = []; // 星が生成される可能性のある枝の座標

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

            for (let i = 0; i < FRUIT_COUNT; i++) { fruits.push(new Fruit()); }
            for (let i = 0; i < STAR_COUNT; i++) { stars.push(new Star()); }
            for (let i = 0; i < 5; i++) { clouds.push(new Cloud()); }
        }

        function windowResized() {
            resizeCanvas(windowWidth * 0.8, windowHeight * 0.8);
            trunkLength = height * 0.2;
        }

        // P5.jsの描画ループ関数
        function draw() {
            let topColor = color(135, 206, 250);
            let bottomColor = color(240, 248, 255);
            setGradient(0, 0, width, height, topColor, bottomColor);

            drawClouds();
            
            activeLeafNodes.clear();
            branchNodes = [];

            push();
            translate(width / 2, height);
            stroke(139, 69, 19, 200);
            strokeWeight(map(mouseY, 0, height, 2, 8));
            branch(trunkLength, 0, 0);
            pop();

            manageFruits();
            manageStars();

            drawFruits();
            drawStars();
            drawParticles();
        }
        
        function setGradient(x, y, w, h, c1, c2) {
            noFill();
            for (let i = y; i <= y + h; i++) {
                let inter = map(i, y, y + h, 0, 1);
                let c = lerpColor(c1, c2, inter);
                stroke(c);
                line(x, i, x + w, i);
            }
        }

        function drawClouds() {
            clouds.forEach(cloud => { cloud.move(); cloud.draw(); });
        }

        function branch(len, depth, branchId) {
            strokeWeight(map(depth, 0, MAX_DEPTH, 8, 1));
            let r = map(depth, 0, MAX_DEPTH, 139, 255);
            let g = map(depth, 0, MAX_DEPTH, 69, 220);
            let b = map(depth, 0, MAX_DEPTH, 19, 220);
            stroke(r, g, b, 200);

            line(0, 0, 0, -len);
            translate(0, -len);

            if (depth > 2) {
                branchNodes.push(applyMatrixVector(createVector(0, 0)));
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

        function manageFruits() { /* ... Fruit logic ... */ }
        function manageStars() {
            let visibleStarCount = stars.filter(s => s.visible).length;

            stars.forEach(star => {
                if (star.visible) {
                    star.lifespan++;
                    if (star.lifespan > star.maxLifespan) {
                        star.visible = false;
                        star.cooldown = 120; // Cooldown before respawning
                    }
                } else if (star.cooldown > 0) {
                    star.cooldown--;
                }
            });

            if (visibleStarCount < STAR_COUNT && branchNodes.length > 0) {
                let availableStar = stars.find(s => !s.visible && s.cooldown <= 0);
                if (availableStar) {
                    let spawnPos = random(branchNodes);
                    availableStar.spawn(spawnPos.x, spawnPos.y);
                }
            }
        }

        function drawFruits() { /* ... Fruit drawing ... */ }
        function drawStars() {
            stars.forEach(star => {
                if (star.visible) star.draw();
            });
        }
        
        function drawParticles() { /* ... Particle drawing ... */ }

        function mousePressed() { /* ... Mouse press logic ... */ }
        
        class Fruit { /* ... Fruit class ... */ }
        class Particle { /* ... Particle class ... */ }

        class Star {
            constructor() {
                this.x = 0;
                this.y = 0;
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
                this.size = random(STAR_MIN_SIZE, STAR_MAX_SIZE);
                this.angle = random(360);
                this.visible = true;
                this.lifespan = 0;
                this.maxLifespan = random(180, 300); // Live for 3-5 seconds
            }

            draw() {
                let brightness = 150 + 105 * sin(frameCount * STAR_TWINKLE_SPEED + this.x);

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

        class Cloud { /* ... Cloud class ... */ }

        function applyMatrixVector(v) {
            let m = drawingContext.getTransform();
            return createVector(v.x * m.a + v.y * m.c + m.e, v.x * m.b + v.y * m.d + m.f);
        }