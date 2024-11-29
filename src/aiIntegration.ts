import axios from "axios";



async function getAIPoweredBotResponse(prompt: string): Promise<string>{
    const apiUrl= "http://localhost:8080/requirementsbits/v1/code_gen/";

    try{
        const response = await axios.post(apiUrl, { prompt });
        return response.data.trim();
        // return response.data;
    }
    catch(error){
        console.error("Error Fetching response:", error);
        return 'Something Went wrong';

    }
}


export { getAIPoweredBotResponse };



// async function getCodeSuggestions(code: string): Promise<string[]> {
//     try {
//         const response = await axios.post('https://api.chatgpt.com/v1/completions', {
//             prompt: `Analyze the following code and suggest improvements:\n${code}`,
//             max_tokens: 150
//         }, {
//             headers: {
//                 'Authorization': `Bearer YOUR_CHATGPT_API_KEY`,
//                 'Content-Type': 'application/json'
//             }
//         });

//         const suggestions = response.data.choices.map((choice: any) => choice.text.trim());
//         return suggestions;
//     } catch (error) {
//         console.error('Error fetching code suggestions:', error);
//         return [];
//     }
// }