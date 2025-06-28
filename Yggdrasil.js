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
            STAR_MAX_SIZE: 5,       // 星の最大サイズ
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

        // Fruits
        function manageFruits() { /* ... */ }
        function drawFruits() { fruits.forEach(f => f.visible && f.draw()); }

        // Stars
        function manageStars() { /* ... */ }
        function drawStars() { stars.forEach(s => s.visible && s.draw()); }

        // Clouds & Particles
        function drawClouds() { clouds.forEach(c => { c.move(); c.draw(); }); }
        function drawParticles() { for (let i = particles.length - 1; i >= 0; i--) { particles[i].update(); particles[i].draw(); if (particles[i].isFinished()) particles.splice(i, 1); } }

        // ==================================================
        // クラス定義 (Classes)
        // ==================================================

        class Fruit { /* ... */ }
        class Star { /* ... */ }
        class Cloud { /* ... */ }
        class Particle { /* ... */ }

        // ==================================================
        // ユーティリティ
        // ==================================================
        function applyMatrixVector(v) {
            let m = drawingContext.getTransform();
            return createVector(v.x * m.a + v.y * m.c + m.e, v.x * m.b + v.y * m.d + m.f);
        }
