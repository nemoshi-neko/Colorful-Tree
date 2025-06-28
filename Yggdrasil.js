        let angle; // 枝の分岐角度
        let trunkLength; // 幹の初期の長さ
        let fruits = []; // 実の情報を格納する配列
        const FRUIT_COUNT = 50; // 実の総数
        const MAX_DEPTH = 8; // 再帰の最大深度 (木の複雑さ)

        // グローバルマップ: どのbranchIdがどのfruitIndexを所有しているかを追跡
        let branchTipToFruitMap = new Map();
        // グローバルマップ: 現在のフレームでアクティブな葉の先端の位置を格納 (branchId -> {x, y})
        let activeLeafNodes = new Map();

        // P5.jsのセットアップ関数
        function setup() {
            createCanvas(windowWidth * 0.8, windowHeight * 0.8); // ウィンドウサイズに合わせてキャンバスを作成
            angleMode(DEGREES); // 角度を度数法に設定
            pixelDensity(1); // 機器によるブレの補正
            
            // 幹の長さをキャンバスの高さに基づいて設定
            trunkLength = height * 0.2; 
            
            // 枝の初期角度をランダムに設定
            angle = random(20, 30);

            // 実のプールを初期化: 全て非表示で初期サイズ0に設定
            for (let i = 0; i < FRUIT_COUNT; i++) {
                fruits.push({
                    x: 0, // 実の絶対X座標
                    y: 0, // 実の絶対Y座標
                    baseSize: random(8, 18), // 実の基準サイズ
                    targetSize: 0, // 目標サイズ（アニメーション用）
                    currentSize: 0, // 現在の描画サイズ（アニメーション用）
                    color: color(random(255), random(255), random(255), 200), // 実の色
                    growSpeed: random(0.05, 0.15), // 成長速度
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
            background(0, 0, 20); // 暗い背景色 (デジタル感)

            activeLeafNodes.clear(); // 毎フレーム、アクティブな葉の先端リストをクリア

            // 画面中央に移動し、下から木を描画
            push(); // 幹の描画と枝の再帰のために描画状態を保存
            translate(width / 2, height); // 原点をキャンバス下中央に移動
            stroke(0, 255, 255); // 木の色 (デジタルなシアン)
            strokeWeight(map(mouseY, 0, height, 1, 6)); // マウスY座標に応じて幹の太さを変更
            
            // 枝の描画を開始。branchIdを0から開始し、枝の構造に応じてユニークなIDを渡す
            // この呼び出し中に activeLeafNodes が更新されます
            branch(trunkLength, 0, 0); 
            
            pop(); // 幹と枝の描画状態を元に戻す

            manageFruits(); // 実のスポーンと消滅ロジックを処理
            drawFruits();   // 実の描画ロジックを処理
        }

        // 再帰的に枝を描画する関数
        // branchId: この枝の先端を一意に識別するためのID (バイナリツリーのノードIDのようなもの)
        function branch(len, depth, branchId) {
            // 枝の太さを深度に応じて減衰させる
            strokeWeight(map(depth, 0, MAX_DEPTH, 6, 1)); 

            // 枝の色を深度に応じて変化させる (幹はシアン、先端は白に近く)
            stroke(map(depth, 0, MAX_DEPTH, 0, 255), map(depth, 0, MAX_DEPTH, 255, 150), map(depth, 0, MAX_DEPTH, 255, 255), 200);

            line(0, 0, 0, -len); // 現在の場所から上向きに枝を描画
            translate(0, -len); // 枝の先端に移動

            len *= 0.7; // 枝の長さを短くする

            depth++; // 深度を増やす

            if (len > 5 && depth < MAX_DEPTH) { // 枝の長さが閾値より大きく、最大深度に達していない場合
                // 左の枝
                push(); // 現在の描画状態を保存
                rotate(angle + sin(frameCount * 0.5 + depth * 10) * 5); // 枝をランダムな角度で回転させ、時間と深度に応じて揺らす
                branch(len, depth, branchId * 2 + 1); // 左の枝に新しいIDを渡す
                pop(); // 保存した描画状態を復元

                // 右の枝
                push(); // 現在の描画状態を保存
                rotate(-angle + cos(frameCount * 0.5 + depth * 10) * 5); // 枝をランダムな角度で回転させ、時間と深度に応じて揺らす
                branch(len, depth, branchId * 2 + 2); // 右の枝に新しいIDを渡す
                pop(); // 保存した描画状態を復元
            } else if (depth >= MAX_DEPTH) { // 最大深度に達した枝の先端に到達 (葉の先端)
                // 現在の変換行列を考慮して枝の先端の絶対位置を計算
                let branchTipPos = createVector(0, 0); 
                branchTipPos = applyMatrixVector(branchTipPos); // キャンバスの絶対座標に変換
                
                // この葉の先端の位置を activeLeafNodes に登録する
                activeLeafNodes.set(branchId, { x: branchTipPos.x, y: branchTipPos.y });
            }
        }

        // 実の生成、寿命管理、枝への割り当て/解除を処理する関数
        function manageFruits() {
            // フェーズ1: 既存の実の状態を更新し、消滅を処理する
            let fruitIndexToBranchTipMap = new Map();
            for (let [branchId, fruitIndex] of branchTipToFruitMap.entries()) {
                fruitIndexToBranchTipMap.set(fruitIndex, branchId);
            }

            for (let i = 0; i < fruits.length; i++) {
                let fruit = fruits[i];

                if (fruit.visible) {
                    // サイズのアニメーションを滑らかにする
                    fruit.currentSize = lerp(fruit.currentSize, fruit.targetSize, fruit.growSpeed);
                    fruit.lifespan++;

                    // 寿命が尽きたら縮小を開始
                    if (fruit.lifespan > fruit.maxLifespan && fruit.targetSize !== 0) {
                        fruit.targetSize = 0; // 縮小開始
                    }

                    // 縮小が完了したら実を非表示にし、クールダウンを設定する
                    if (fruit.currentSize < 1 && fruit.targetSize === 0) { 
                        fruit.visible = false; 
                        // 実が消える際に、その実を所有していた枝の紐づけも解除する
                        let associatedBranchId = fruitIndexToBranchTipMap.get(i);
                        if (associatedBranchId !== undefined) {
                            branchTipToFruitMap.delete(associatedBranchId); // マップから削除
                        }
                        fruit.cooldown = 30; // 非表示になったらクールダウンを設定 (30フレーム)
                    }

                    // 実が表示状態であれば、関連する枝先の絶対位置に更新する
                    let associatedBranchId = fruitIndexToBranchTipMap.get(i);
                    if (associatedBranchId !== undefined && activeLeafNodes.has(associatedBranchId)) {
                        let leafPos = activeLeafNodes.get(associatedBranchId);
                        fruit.x = leafPos.x;
                        fruit.y = leafPos.y;
                    } else if (associatedBranchId !== undefined) {
                        // 枝先がもはやアクティブでない場合（木の形状変化など）、実も消滅させる
                        fruit.targetSize = 0; // 縮小を開始
                    }

                } else {
                    // 非表示の実の場合、クールダウンを減らす
                    if (fruit.cooldown > 0) {
                        fruit.cooldown--;
                    }
                }
            }

            // フェーズ2: FRUIT_COUNT に達するまで新しい実をスポーンさせる
            let currentVisibleFruitCount = 0;
            for (let i = 0; i < FRUIT_COUNT; i++) {
                if (fruits[i].visible) {
                    currentVisibleFruitCount++;
                }
            }

            // 利用可能な実のインデックスを特定する
            let availableFruitIndices = [];
            for (let i = 0; i < FRUIT_COUNT; i++) {
                if (!fruits[i].visible && fruits[i].cooldown <= 0) {
                    availableFruitIndices.push(i);
                }
            }

            // 実が割り当てられていない枝先を特定する
            let occupiedBranchIds = new Set(branchTipToFruitMap.keys());
            let unoccupiedBranchIds = [];
            for (let branchId of activeLeafNodes.keys()) {
                if (!occupiedBranchIds.has(branchId)) {
                    unoccupiedBranchIds.push(branchId);
                }
            }

            // 現在表示されている実の数が最大実数より少なく、かつ利用可能な実と空いている枝先がある場合、実をスポーンさせる
            while (currentVisibleFruitCount < FRUIT_COUNT &&
                   availableFruitIndices.length > 0 &&
                   unoccupiedBranchIds.length > 0) {

                // 利用可能な実の中からランダムに一つ選択
                let randomFruitPoolIndex = floor(random(availableFruitIndices.length));
                let selectedFruitIndex = availableFruitIndices.splice(randomFruitPoolIndex, 1)[0]; // 選択した実をプールから削除

                // 空いている枝先の中からランダムに一つ選択
                let randomBranchPoolIndex = floor(random(unoccupiedBranchIds.length));
                let selectedBranchId = unoccupiedBranchIds.splice(randomBranchPoolIndex, 1)[0]; // 選択した枝先をプールから削除

                let fruitToSpawn = fruits[selectedFruitIndex];
                let branchPos = activeLeafNodes.get(selectedBranchId);

                if (branchPos) { // 枝先の位置が有効であることを確認
                    branchTipToFruitMap.set(selectedBranchId, selectedFruitIndex); // 新しい紐づけをマップに登録

                    // 新しくスポーンした実のプロパティを初期化
                    fruitToSpawn.x = branchPos.x;
                    fruitToSpawn.y = branchPos.y;
                    fruitToSpawn.visible = true;
                    fruitToSpawn.baseSize = random(8, 18);
                    fruitToSpawn.color = color(random(255), random(255), random(255), 200);
                    fruitToSpawn.targetSize = fruitToSpawn.baseSize;
                    fruitToSpawn.currentSize = 0; // 0から成長開始
                    fruitToSpawn.lifespan = 0;
                    fruitToSpawn.maxLifespan = random(400, 600); // 寿命を少し短くして回転を速める
                    fruitToSpawn.cooldown = 0; // スポーン時はクールダウンなし

                    currentVisibleFruitCount++; // 表示中の実の数を増やす
                }
            }
        }

        // 実を描画する関数
        function drawFruits() {
            for (let i = 0; i < fruits.length; i++) {
                let fruit = fruits[i];

                if (!fruit.visible) {
                    continue; // 表示されていなければスキップ
                }

                let d = dist(mouseX, mouseY, fruit.x, fruit.y); // マウスと実の距離を計算

                // ホバー時のサイズと色の変化
                if (d < fruit.currentSize / 2 + 5) { // マウスが実の近くにある場合
                    // 既にターゲットサイズが拡大状態でなければ更新
                    if (fruit.targetSize !== fruit.baseSize * 1.5) { 
                        fruit.targetSize = fruit.baseSize * 1.5; // 大きくする
                    }
                    fill(255, 255, 0, 255); // 黄色に光らせる
                    stroke(255, 255, 0, 150); // 黄色のボーダー
                    strokeWeight(2);
                } else {
                    // ホバー状態から戻る、または縮小アニメーション中でない場合
                    if (fruit.targetSize === fruit.baseSize * 1.5 || (fruit.targetSize !== 0 && fruit.lifespan <= fruit.maxLifespan)) {
                        // 寿命が尽きていなければ元のサイズに戻す（ホバー解除時）
                        fruit.targetSize = fruit.baseSize; 
                    }
                    fill(fruit.color); // 元の色
                    noStroke();
                }

                // 実を描画 (絶対座標を使用)
                ellipse(fruit.x, fruit.y, fruit.currentSize, fruit.currentSize); 

                // デジタルな光沢を追加
                for(let j = 0; j < 3; j++) {
                    fill(255, 255, 255, 30 - j * 10);
                    ellipse(fruit.x, fruit.y, fruit.currentSize * (0.8 + j * 0.1), fruit.currentSize * (0.8 + j * 0.1));
                }
            }
        }

        // マウスクリック時のイベント
        function mousePressed() {
            for (let i = 0; i < fruits.length; i++) {
                let fruit = fruits[i];
                if (!fruit.visible) continue;

                let d = dist(mouseX, mouseY, fruit.x, fruit.y);
                if (d < fruit.currentSize / 2 + 5) { // 実がクリックされた場合
                    fruit.color = color(255, 0, 0, 200); // 色を赤に変更
                    // 実を消滅させるためのロジックは削除しました。
                    // その代わり、色が変わります。
                    // 実は依然として寿命によって自動的に消滅します。
                    break; // 複数の実が重なっている場合でも一つだけ反応させる
                }
            }
        }

        // 現在のtransformマトリックスを考慮してベクトルの絶対位置を計算するヘルパー関数
        function applyMatrixVector(v) {
            let m = drawingContext.getTransform();
            return createVector(v.x * m.a + v.y * m.c + m.e, v.x * m.b + v.y * m.d + m.f);
        }
