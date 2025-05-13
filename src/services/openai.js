const { OpenAI } = require('openai');

// OpenAI設定
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 手のひら画像をOpenAI Vision APIで分析する
 * @param {string} base64Image - Base64エンコードされた画像データ
 * @returns {Promise<string>} 手相鑑定結果
 */
exports.analyzeHandImage = async (base64Image) => {
  try {
    console.log('OpenAI API呼び出し開始');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `手相から下記を診断してください。
          ・生命線
          ・知能線
          ・感情線
          ・運命線
          ・太陽線
それぞれのカテゴリについて具体的に分析し、ポジティブで具体的なアドバイスを含めてください。
回答は日本語で、親しみやすくかつ専門的な手相占いの結果となるよう心がけてください。
全体で800文字程度におさめてください。`
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "この手のひらの画像から手相を詳しく鑑定してください。" 
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
    });
    
    console.log('OpenAI API呼び出し成功');
    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI APIエラー:', error);
    
    // エラーメッセージをより詳細に
    if (error.status === 404) {
      throw new Error('モデルが見つかりません。最新のOpenAIモデルを使用するよう設定を更新してください。');
    } else if (error.status === 429) {
      throw new Error('APIレート制限に達しました。しばらく時間をおいてから再試行してください。');
    } else {
      throw new Error('画像の分析中にエラーが発生しました: ' + (error.message || '不明なエラー'));
    }
  }
};
