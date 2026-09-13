document.addEventListener('DOMContentLoaded', () => {
    // APIキーの初期化（ローカルストレージから読み込み）
    const apiKeyInput = document.getElementById('apiKey');
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        apiKeyInput.value = savedKey;
    }

    // フォームと各要素の取得
    const chatForm = document.getElementById('chatForm');
    const userInput = document.getElementById('userInput');
    const clearBtn = document.getElementById('clearBtn');
    const saveKeyBtn = document.getElementById('saveKeyBtn');
    const loading = document.getElementById('loading');
    const chatHistory = document.getElementById('chatHistory');

    // 1. APIキー保存ボタンの動作
    saveKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('gemini_api_key', key);
            alert('APIキーを保存しました。');
        } else {
            localStorage.removeItem('gemini_api_key');
            alert('APIキーを削除しました。');
        }
    });

    // 2. 入力クリアボタンの動作
    clearBtn.addEventListener('click', () => {
        userInput.value = '';
        userInput.focus();
    });

    // 3. 送信イベント処理
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const question = userInput.value.trim();
        const apiKey = apiKeyInput.value.trim() || localStorage.getItem('gemini_api_key');

        if (!question) {
            alert('相談内容を入力してください。');
            return;
        }

        if (!apiKey) {
            alert('画面上の「🔑 はじめに：APIキーの設定」を開き、Gemini APIキーを入力してください。');
            return;
        }

        // 初期表示テキストがあれば消す
        const placeholder = chatHistory.querySelector('.placeholder-text');
        if (placeholder) {
            placeholder.remove();
        }

        // ユーザーの質問を画面に追加
        appendMessage('あなた', question, 'user');
        userInput.value = '';

        // ローディング表示
        loading.classList.remove('hidden');

        try {
            // Gemini API呼び出し
            const responseText = await callGeminiAPI(apiKey, question);
            // AIの返答を画面に追加
            appendMessage('🌸 AI相談員', responseText, 'ai');
        } catch (error) {
            console.error('エラー詳細:', error);
            appendMessage('⚠️ お知らせ', '申し訳ありません。うまくお返事を届けることができませんでした。時間をおいてもう一度お試しいただくか、APIキーをご確認ください。', 'ai');
        } finally {
            // ローディング非表示
            loading.classList.add('hidden');
        }
    });
});

// 文字サイズ変更機能
function changeFontSize(sizeClass) {
    document.body.className = sizeClass;
    
    // ボタンの見た目切替
    document.querySelectorAll('.btn-size').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

// クイック質問ボタンを押した時の入力
function setQuickQuestion(text) {
    const userInput = document.getElementById('userInput');
    userInput.value = text;
    userInput.focus();
}

// チャットメッセージを画面に追加表示する関数
function appendMessage(sender, text, type) {
    const chatHistory = document.getElementById('chatHistory');

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;

    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';
    headerDiv.textContent = sender;

    // AIの返答の場合は「声で聴く（読み上げ）」ボタンを追加
    if (type === 'ai') {
        const speakBtn = document.createElement('button');
        speakBtn.type = 'button';
        speakBtn.className = 'speak-btn';
        speakBtn.textContent = '🔊 声で聴く';
        speakBtn.onclick = () => speakText(text);
        headerDiv.appendChild(speakBtn);
    }

    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'message-body';
    bodyDiv.textContent = text;

    msgDiv.appendChild(headerDiv);
    msgDiv.appendChild(bodyDiv);

    chatHistory.appendChild(msgDiv);
    msgDiv.scrollIntoView({ behavior: 'smooth' });
}

// Web Speech APIを使った音声読み上げ機能
function speakText(text) {
    if ('speechSynthesis' in window) {
        // 既存の読み上げを停止
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 0.9; // 高齢者向けに少しゆっくりめ
        utterance.pitch = 1.0;
        
        window.speechSynthesis.speak(utterance);
    } else {
        alert('お使いのブラウザは音声読み上げに対応していません。');
    }
}

// Gemini API連携処理
async function callGeminiAPI(apiKey, userPrompt) {
    // 高齢者の方に優しく、わかりやすく答えるようシステム指示を付与
    const systemInstruction = "あなたは高齢者の親切で温かい相談員です。難しい専門用語やカタカナ語はなるべく避け、丁寧で優しい日本語で、短く分かりやすく答えてください。";
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [
            {
                role: "user",
                parts: [
                    { text: `${systemInstruction}\n\n相談内容: ${userPrompt}` }
                ]
            }
        ]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        throw new Error(`APIエラー (ステータス: ${response.status})`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}