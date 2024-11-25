import axios from "axios";



async function getAIPoweredBotResponse(prompt: string): Promise<string>{
    const apiUrl= "http://localhost:8080/requirementsbits/v1/code_gen/"

    try{
        const response = await axios.post(apiUrl, { prompt })
        return response.data.bot.trim();
    }
    catch(error){
        console.error("Error Fetching response:", error)
        return 'Something Went wrong'

    }
}

export { getAIPoweredBotResponse }