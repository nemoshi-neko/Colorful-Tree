        let angle; // 枝の分岐角度
        let trunkLength; // 幹の初期の長さ
        let fruits = []; // 実の情報を格納する配列
        const FRUIT_COUNT = 50; // 実の総数
        const MAX_DEPTH = 8; // 再帰の最大深度 (木の複雑さ)
        let pastelColors = []; // パステルカラーの配列

        // グローバルマップ: どのbranchIdがどのfruitIndexを所有しているかを追跡
        let branchTipToFruitMap = new Map();
        // グローバルマップ: 現在のフレームでアクティブな葉の先端の位置を格納 (branchId -> {x, y})
        let activeLeafNodes = new Map();

        // P5.jsのセットアップ関数
        function setup() {
            createCanvas(windowWidth * 0.8, windowHeight * 0.8); // ウィンドウサイズに合わせてキャンバスを作成
            angleMode(DEGREES); // 角度を度数法に設定
            pixelDensity(1); // 機器によるブレの補正
            
            // 可愛いパステルカラーの定義
            pastelColors = [
                color(255, 182, 193, 200), // ライトピンク
                color(255, 223, 186, 200), // ライトオレンジ
                color(255, 255, 186, 200), // ライトイエロー
                color(186, 255, 201, 200), // ミントグリーン
                color(186, 225, 255, 200)  // ライトブルー
            ];

            // 幹の長さをキャンバスの高さに基づいて設定
            trunkLength = height * 0.2; 
            
            // 枝の初期角度をランダムに設定
            angle = random(20, 35);

            // 実のプールを初期化: 全て非表示で初期サイズ0に設定
            for (let i = 0; i < FRUIT_COUNT; i++) {
                fruits.push({
                    x: 0, // 実の絶対X座標
                    y: 0, // 実の絶対Y座標
                    baseSize: random(10, 22), // 実の基準サイズ
                    targetSize: 0, // 目標サイズ（アニメーション用）
                    currentSize: 0, // 現在の描画サイズ（アニメーション用）
                    color: random(pastelColors), // 実の色
                    growSpeed: random(0.05, 0.1), // 成長速度
                    visible: false, // 表示状態
                    lifespan: 0, // 寿命カウンター
                    maxLifespan: random(600, 1200), // 自動消滅までのフレーム数
                    cooldown: 0 // 実が非表示になった後のクールダウン期間
                });
            }
        }

        // ウィンドウサイズが変更されたときにキャンバスをリサイズ
        function windowResized() {
            resizeCanvas(windowWidth * 0.8, windowHeight * 0.8);
            trunkLength = height * 0.2;
        }

        // P5.jsの描画ループ関数
        function draw() {
            background(250, 245, 255); // 淡いラベンダー色の背景

            activeLeafNodes.clear(); // 毎フレーム、アクティブな葉の先端リストをクリア

            // 画面中央に移動し、下から木を描画
            push(); // 幹の描画と枝の再帰のために描画状態を保存
            translate(width / 2, height); // 原点をキャンバス下中央に移動
            stroke(160, 82, 45, 200); // 木の色 (茶色)
            strokeWeight(map(mouseY, 0, height, 2, 8)); // マウスY座標に応じて幹の太さを変更
            
            // 枝の描画を開始。branchIdを0から開始し、枝の構造に応じてユニークなIDを渡す
            branch(trunkLength, 0, 0); 
            
            pop(); // 幹と枝の描画状態を元に戻す

            manageFruits(); // 実のスポーンと消滅ロジックを処理
            drawFruits();   // 実の描画ロジックを処理
        }

        // 再帰的に枝を描画する関数
        function branch(len, depth, branchId) {
            // 枝の太さを深度に応じて減衰させる
            strokeWeight(map(depth, 0, MAX_DEPTH, 8, 1)); 

            // 枝の色を深度に応じて変化させる (幹は茶色、先端はピンクがかった白に)
            let r = map(depth, 0, MAX_DEPTH, 160, 255);
            let g = map(depth, 0, MAX_DEPTH, 82, 220);
            let b = map(depth, 0, MAX_DEPTH, 45, 220);
            stroke(r, g, b, 200);

            line(0, 0, 0, -len); // 現在の場所から上向きに枝を描画
            translate(0, -len); // 枝の先端に移動

            len *= 0.75; // 枝の長さを少し長めに

            depth++; // 深度を増やす

            if (len > 6 && depth < MAX_DEPTH) { // 枝の長さが閾値より大きく、最大深度に達していない場合
                // 左の枝
                push();
                rotate(angle + sin(frameCount * 0.2 + depth * 15) * 4); // 揺れを緩やかに
                branch(len, depth, branchId * 2 + 1);
                pop();

                // 右の枝
                push();
                rotate(-angle + cos(frameCount * 0.2 + depth * 15) * 4); // 揺れを緩やかに
                branch(len, depth, branchId * 2 + 2);
                pop();
            } else if (depth >= MAX_DEPTH) { // 最大深度に達した枝の先端に到達 (葉の先端)
                let branchTipPos = createVector(0, 0); 
                branchTipPos = applyMatrixVector(branchTipPos);
                activeLeafNodes.set(branchId, { x: branchTipPos.x, y: branchTipPos.y });
            }
        }

        // 実の管理
        function manageFruits() {
            let fruitIndexToBranchTipMap = new Map();
            for (let [branchId, fruitIndex] of branchTipToFruitMap.entries()) {
                fruitIndexToBranchTipMap.set(fruitIndex, branchId);
            }

            for (let i = 0; i < fruits.length; i++) {
                let fruit = fruits[i];
                if (fruit.visible) {
                    fruit.currentSize = lerp(fruit.currentSize, fruit.targetSize, fruit.growSpeed);
                    fruit.lifespan++;
                    if (fruit.lifespan > fruit.maxLifespan && fruit.targetSize !== 0) {
                        fruit.targetSize = 0;
                    }
                    if (fruit.currentSize < 1 && fruit.targetSize === 0) {
                        fruit.visible = false;
                        let associatedBranchId = fruitIndexToBranchTipMap.get(i);
                        if (associatedBranchId !== undefined) {
                            branchTipToFruitMap.delete(associatedBranchId);
                        }
                        fruit.cooldown = 30;
                    }
                    let associatedBranchId = fruitIndexToBranchTipMap.get(i);
                    if (associatedBranchId !== undefined && activeLeafNodes.has(associatedBranchId)) {
                        let leafPos = activeLeafNodes.get(associatedBranchId);
                        fruit.x = leafPos.x;
                        fruit.y = leafPos.y;
                    } else if (associatedBranchId !== undefined) {
                        fruit.targetSize = 0;
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
                    fruitToSpawn.baseSize = random(10, 22);
                    fruitToSpawn.color = random(pastelColors);
                    fruitToSpawn.targetSize = fruitToSpawn.baseSize;
                    fruitToSpawn.currentSize = 0;
                    fruitToSpawn.lifespan = 0;
                    fruitToSpawn.maxLifespan = random(400, 600);
                    fruitToSpawn.cooldown = 0;
                    currentVisibleFruitCount++;
                }
            }
        }

        // 実を描画する関数
        function drawFruits() {
            for (let i = 0; i < fruits.length; i++) {
                let fruit = fruits[i];
                if (!fruit.visible) continue;

                let d = dist(mouseX, mouseY, fruit.x, fruit.y);

                if (d < fruit.currentSize / 2 + 10) {
                    if (fruit.targetSize !== fruit.baseSize * 1.5) {
                        fruit.targetSize = fruit.baseSize * 1.5;
                    }
                    fill(255, 182, 193, 255); // 明るいピンク
                    stroke(255, 255, 255, 200);
                    strokeWeight(3);
                } else {
                    if (fruit.targetSize === fruit.baseSize * 1.5 || (fruit.targetSize !== 0 && fruit.lifespan <= fruit.maxLifespan)) {
                        fruit.targetSize = fruit.baseSize;
                    }
                    fill(fruit.color);
                    noStroke();
                }

                ellipse(fruit.x, fruit.y, fruit.currentSize, fruit.currentSize);

                // 柔らかい光沢
                for(let j = 0; j < 3; j++) {
                    fill(255, 255, 255, 80 - j * 25);
                    ellipse(fruit.x, fruit.y, fruit.currentSize * (0.7 + j * 0.1), fruit.currentSize * (0.7 + j * 0.1));
                }
            }
        }

        // マウスクリック時のイベント
        function mousePressed() {
            for (let i = 0; i < fruits.length; i++) {
                let fruit = fruits[i];
                if (!fruit.visible) continue;

                let d = dist(mouseX, mouseY, fruit.x, fruit.y);
                if (d < fruit.currentSize / 2 + 10) {
                    fruit.color = color(255, 0, 255, 200); // マゼンタ色に変更
                    break;
                }
            }
        }

        // 現在のtransformマトリックスを考慮してベクトルの絶対位置を計算するヘルパー関数
        function applyMatrixVector(v) {
            let m = drawingContext.getTransform();
            return createVector(v.x * m.a + v.y * m.c + m.e, v.x * m.b + v.y * m.d + m.f);
        }
