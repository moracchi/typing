document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const titleScreen = document.getElementById('title-screen');
    const playScreen = document.getElementById('play-screen');
    const resultScreen = document.getElementById('result-screen');
    const themeSelect = document.getElementById('theme-select');
    const startButton = document.getElementById('start-button');
    const backToTitleButton = document.getElementById('back-to-title-button');
    
    // プレイ画面要素
    const timerDisplay = document.getElementById('timer');
    const comboDisplay = document.getElementById('combo');
    const questionArea = document.getElementById('question-area');
    const questionWordKana = document.getElementById('question-word-kana');
    const questionWordRoman = document.getElementById('question-word-roman');
    const inputDisplayCorrect = document.getElementById('input-display-correct');
    const inputDisplayRemaining = document.getElementById('input-display-remaining');
    const questionCounter = document.getElementById('current-question-num');
    const effectContainer = document.getElementById('effect-container');

    // 結果画面要素
    const resultTime = document.getElementById('result-time');
    const resultMaxCombo = document.getElementById('result-max-combo');
    const resultMistakes = document.getElementById('result-mistakes');
    const bestTimeLabel = document.getElementById('best-time-label');
    const bestTimeUpdateMessage = document.getElementById('best-time-update-message');

    // 効果音要素
    const correctSound = document.getElementById('correct-sound');
    const fanfareSound = document.getElementById('fanfare-sound');
    
    // --- ローマ字変換マップ ---
    const romanMap = {
        'a':'あ', 'i':'い', 'u':'う', 'e':'え', 'o':'お', 'ka':'か', 'ki':'き', 'ku':'く', 'ke':'け', 'ko':'こ', 'sa':'さ', 'shi':'し', 'su':'す', 'se':'せ', 'so':'そ', 'ta':'た', 'chi':'ち', 'tsu':'つ', 'te':'て', 'to':'と', 'na':'な', 'ni':'に', 'nu':'ぬ', 'ne':'ね', 'no':'の', 'ha':'は', 'hi':'ひ', 'fu':'ふ', 'he':'へ', 'ho':'ほ', 'ma':'ま', 'mi':'み', 'mu':'む', 'me':'め', 'mo':'も', 'ya':'や', 'yu':'ゆ', 'yo':'よ', 'ra':'ら', 'ri':'り', 'ru':'る', 're':'れ', 'ro':'ろ', 'wa':'わ', 'wo':'を', 'n':'ん', 'ga':'が', 'gi':'ぎ', 'gu':'ぐ', 'ge':'げ', 'go':'ご', 'za':'ざ', 'ji':'じ', 'zu':'ず', 'ze':'ぜ', 'zo':'ぞ', 'da':'だ', 'di':'ぢ', 'du':'づ', 'de':'で', 'do':'ど', 'ba':'ば', 'bi':'び', 'bu':'ぶ', 'be':'べ', 'bo':'ぼ', 'pa':'ぱ', 'pi':'ぴ', 'pu':'ぷ', 'pe':'ぺ', 'po':'ぽ', 'kya':'きゃ', 'kyu':'きゅ', 'kyo':'きょ', 'sha':'しゃ', 'shu':'しゅ', 'sho':'しょ', 'cha':'ちゃ', 'chu':'ちゅ', 'cho':'ちょ', 'nya':'にゃ', 'nyu':'にゅ', 'nyo':'にょ', 'hya':'ひゃ', 'hyu':'ひゅ', 'hyo':'ひょ', 'mya':'みゃ', 'myu':'みゅ', 'myo':'みょ', 'rya':'りゃ', 'ryu':'りゅ', 'ryo':'りょ', 'gya':'ぎゃ', 'gyu':'ぎゅ', 'gyo':'ぎょ', 'ja':'じゃ', 'ju':'じゅ', 'jo':'じょ', 'bya':'びゃ', 'byu':'びゅ', 'byo':'びょ', 'pya':'ぴゃ', 'pyu':'ぴゅ', 'pyo':'ぴょ', 'si':'し', 'ti':'ち', 'tu':'つ', 'hu':'ふ', 'zi':'じ',
    };

    // --- ゲーム状態管理 ---
    let wordsData;
    let questions = [];
    let currentQuestionIndex = 0;
    
    let runtimeState = {
        combo: 0, maxCombo: 0, mistakes: 0, startTime: 0, timerInterval: null, inputRaw: "",
    };

    // --- 初期化処理 ---
    async function init() {
        try {
            const response = await fetch('./data/words.json');
            wordsData = await response.json();
            
            wordsData.themes.forEach(theme => {
                const option = document.createElement('option');
                option.value = theme.theme;
                option.textContent = theme.theme;
                themeSelect.appendChild(option);
            });
            
            updateBestTimeDisplay();

        } catch (error) {
            console.error('単語ファイルの読み込みに失敗しました:', error);
            alert('単語ファイルの読み込みに失敗しました。');
        }

        startButton.addEventListener('click', startGame);
        backToTitleButton.addEventListener('click', backToTitle);
        document.addEventListener('keydown', handleKeydown);
    }
    
    function switchScreen(screen) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        screen.classList.add('active');
    }

    function startGame() {
        const selectedTheme = themeSelect.value;
        const themeData = wordsData.themes.find(t => t.theme === selectedTheme);
        if (!themeData) return;
        questions = [...themeData.items].sort(() => 0.5 - Math.random()).slice(0, 10);
        currentQuestionIndex = 0;
        runtimeState = {
            combo: 0, maxCombo: 0, mistakes: 0, startTime: Date.now(), timerInterval: setInterval(updateTimer, 10), inputRaw: "",
        };
        switchScreen(playScreen);
        showNextQuestion();
        updateStats();
    }

    function showNextQuestion() {
        if (currentQuestionIndex >= questions.length) {
            endGame();
            return;
        }
        const question = questions[currentQuestionIndex];
        questionWordKana.textContent = question;
        questionCounter.textContent = currentQuestionIndex + 1;
        runtimeState.inputRaw = "";
        questionWordRoman.textContent = kanaToRoman(question);
        updateInputDisplay();
    }
    
    // --- 変更: 入力処理 ---
    function handleKeydown(e) {
        if (playScreen.classList.contains('active')) {
            e.preventDefault();
            const targetRoman = kanaToRoman(questionWordKana.textContent);

            if (e.key.match(/^[a-zA-Z-]$/)) {
                runtimeState.inputRaw += e.key.toLowerCase();
            } else if (e.key === 'Backspace') {
                runtimeState.inputRaw = runtimeState.inputRaw.slice(0, -1);
            } else if (e.key === 'Enter') {
                checkAnswer(true); // Enterキーによる判定であることを示すフラグを渡す
                return;
            }

            // --- ここから修正 ---
            // 1文字入力するごとに、間違いがないかチェックする
            if (!targetRoman.startsWith(runtimeState.inputRaw)) {
                // 間違えたので、即座に不正解処理を行う
                handleMistake();
                return; // ここで処理を中断
            }
            // --- ここまで修正 ---
            
            updateInputDisplay();
            
            // 入力が完全に一致したら、自動で正解判定
            if (targetRoman === runtimeState.inputRaw) {
                checkAnswer(false);
            }
        }
    }
    
    function updateInputDisplay() {
        const targetRoman = kanaToRoman(questionWordKana.textContent);
        let correctPart = runtimeState.inputRaw;
        let remainingPart = targetRoman.substring(runtimeState.inputRaw.length);
        
        inputDisplayCorrect.textContent = correctPart;
        inputDisplayRemaining.textContent = remainingPart;
    }

    // --- 変更: 正解判定 ---
    // isEnterPressed引数を追加
    function checkAnswer(isEnterPressed) {
        const targetRoman = kanaToRoman(questionWordKana.textContent);

        if (runtimeState.inputRaw === targetRoman) {
            // 正解処理
            questionWordKana.classList.add('correct-animation');
            setTimeout(() => questionWordKana.classList.remove('correct-animation'), 300);
            correctSound.currentTime = 0;
            correctSound.play();
            runtimeState.combo++;
            if (runtimeState.combo > runtimeState.maxCombo) {
                runtimeState.maxCombo = runtimeState.maxCombo;
            }
            if ([3, 5, 10].includes(runtimeState.combo)) {
                showComboEffect();
            }
            currentQuestionIndex++;
            setTimeout(showNextQuestion, 100);
        } else if (isEnterPressed) {
            // Enterキーが押された時だけ、不一致を不正解とする
            handleMistake();
        }
        updateStats();
    }

    // --- 追加: 不正解処理をまとめた関数 ---
    function handleMistake() {
        questionArea.classList.add('shake-animation');
        setTimeout(() => questionArea.classList.remove('shake-animation'), 500);
        runtimeState.combo = 0;
        runtimeState.mistakes++;
        runtimeState.inputRaw = ""; 
        updateInputDisplay();
        updateStats(); // ミス数を反映するために呼び出す
    }

    function endGame() {
        clearInterval(runtimeState.timerInterval);
        const elapsedTime = (Date.now() - runtimeState.startTime) / 1000;
        fanfareSound.currentTime = 0;
        fanfareSound.play();
        resultTime.textContent = `${elapsedTime.toFixed(3)}秒`;
        resultMaxCombo.textContent = `${runtimeState.maxCombo}回`;
        resultMistakes.textContent = `${runtimeState.mistakes}回`;
        const bestTime = getBestTime();
        if (bestTime === null || elapsedTime < bestTime) {
            saveBestTime(elapsedTime);
            bestTimeUpdateMessage.textContent = "自己ベスト更新！🎉";
        } else {
            bestTimeUpdateMessage.textContent = "";
        }
        switchScreen(resultScreen);
    }
    
    function backToTitle() {
        switchScreen(titleScreen);
        updateBestTimeDisplay();
    }
    
    function updateStats() {
        comboDisplay.textContent = `コンボ: ${runtimeState.combo}`;
    }

    function updateTimer() {
        const elapsedTime = (Date.now() - runtimeState.startTime) / 1000;
        timerDisplay.textContent = `けいかじかん: ${elapsedTime.toFixed(3)}`;
    }
    
    function getBestTime() {
        const time = localStorage.getItem('kenchanTypingBestTime');
        return time ? parseFloat(time) : null;
    }

    function saveBestTime(time) {
        localStorage.setItem('kenchanTypingBestTime', time);
    }
    
    function updateBestTimeDisplay() {
        const bestTime = getBestTime();
        if (bestTime) {
            bestTimeLabel.textContent = `${bestTime.toFixed(3)}秒`;
        } else {
            bestTimeLabel.textContent = "--:--.---";
        }
    }

    function showComboEffect() {
        for (let i = 0; i < 20; i++) {
            const sparkle = document.createElement('div');
            sparkle.classList.add('sparkle');
            sparkle.style.top = `${Math.random() * 100}%`;
            sparkle.style.left = `${Math.random() * 100}%`;
            sparkle.style.animationDelay = `${Math.random() * 0.5}s`;
            effectContainer.appendChild(sparkle);
            setTimeout(() => sparkle.remove(), 1000);
        }
    }

    function kanaToRoman(kana) {
        const simpleReverseMap = {};
        for (const [r, k] of Object.entries(romanMap)) {
            if (!simpleReverseMap[k] || simpleReverseMap[k].length > r.length) {
                simpleReverseMap[k] = r;
            }
        }
    
        let result = '';
        let tempKana = kana;
    
        while (tempKana.length > 0) {
            if (tempKana[0] === 'ー') {
                result += '-';
                tempKana = tempKana.substring(1);
                continue;
            }
    
            let matched = false;
            for (let len = 2; len >= 1; len--) {
                if (tempKana.length >= len) {
                    const sub = tempKana.substring(0, len);
                    if (simpleReverseMap[sub]) {
                        result += simpleReverseMap[sub];
                        tempKana = tempKana.substring(len);
                        matched = true;
                        break;
                    }
                }
            }
            if (!matched) {
                result += tempKana[0];
                tempKana = tempKana.substring(1);
            }
        }
        return result;
    }    

    init();
});