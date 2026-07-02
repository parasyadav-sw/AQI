from fastapi import APIRouter, HTTPException
from app.schemas import ChatRequest, ChatResponse, CarbonCalculatorRequest, CarbonCalculatorResponse, RouteRecommendationRequest, RouteRecommendationResponse
from app.services.route_service import calculate_carbon, calculate_green_route

router = APIRouter(tags=["AI Features"])

# ==========================
# CHATBOT KNOWLEDGE BASE
# ==========================
RESPONSES = {
    "en": {
        "hello": "Hello! I am AirGuard AI, your smart air quality companion. How can I help you today?",
        "pm2.5": "PM2.5 refers to fine particulate matter that is 2.5 micrometers or smaller. Because of their tiny size, they can penetrate deep into lungs and enter the bloodstream, causing respiratory and cardiovascular issues.",
        "pm10": "PM10 is coarse particulate matter under 10 micrometers. It includes dust, pollen, and mold. It can irritate eyes, nose, and throat, but is less likely to enter the bloodstream compared to PM2.5.",
        "grap": "GRAP (Graded Response Action Plan) is a set of emergency measures implemented by government bodies depending on AQI severity. It includes construction bans, shutting brick kilns, work-from-home guidelines, and the Odd-Even vehicle scheme.",
        "mask": "During high pollution days (AQI > 150), N95 or N99 respirators are highly recommended. Normal surgical or cloth masks do not filter PM2.5 effectively.",
        "asthma": "Asthma patients should minimize outdoor activities, keep rescue inhalers nearby, and run indoor air purifiers when AQI exceeds 100.",
        "purifier": "HEPA air purifiers are highly effective in reducing indoor PM2.5. Make sure to keep windows closed when running them.",
        "default": "I can help you with air quality queries, explaining pollutants (PM2.5, PM10), advising health precautions, explaining GRAP stages, or calculating your carbon footprint. What would you like to know?"
    },
    "hi": {
        "hello": "नमस्ते! मैं एयरगार्ड एआई (AirGuard AI) हूँ, आपका वायु गुणवत्ता सहायक। मैं आज आपकी क्या मदद कर सकता हूँ?",
        "pm2.5": "PM2.5 का मतलब सूक्ष्म कण पदार्थ (Fine Particulate Matter) है जो 2.5 माइक्रोमीटर या उससे छोटे होते हैं। छोटे होने के कारण, वे फेफड़ों में गहराई से प्रवेश कर सकते हैं और रक्तप्रवाह में मिल सकते हैं, जिससे सांस और दिल की बीमारियां होती हैं।",
        "pm10": "PM10 मोटे कण पदार्थ (Coarse Particulate Matter) हैं जो 10 माइक्रोमीटर से छोटे होते हैं। इसमें धूल, पराग और फफूंद शामिल हैं। यह आंखों, नाक और गले में जलन पैदा कर सकता है।",
        "grap": "ग्रैप (GRAP - ग्रेडेड रिस्पांस एक्शन प्लान) वायु प्रदूषण बढ़ने पर सरकार द्वारा लागू किए जाने वाले आपातकालीन नियम हैं। इसमें निर्माण कार्यों पर प्रतिबंध, उद्योग बंद करना, और वाहनों के लिए ऑड-इवन नियम शामिल हैं।",
        "mask": "प्रदूषण के दिनों में (AQI > 150), N95 या N99 मास्क पहनना बहुत जरूरी है। साधारण कपड़े के मास्क PM2.5 को नहीं रोक पाते।",
        "asthma": "दमा (Asthma) के रोगियों को बाहर जाने से बचना चाहिए, अपनी दवाइयां साथ रखनी चाहिए और एक कमरे में एयर प्यूरीफायर का उपयोग करना चाहिए।",
        "purifier": "HEPA एयर प्यूरिफायर बंद कमरों में PM2.5 को साफ करने में बहुत मददगार होते हैं। इन्हें चलाते समय खिड़कियां बंद रखें।",
        "default": "मैं वायु प्रदूषण, स्वास्थ्य सलाह, ग्रैप नियमों और कार्बन उत्सर्जन की गणना में आपकी सहायता कर सकता हूँ। आप क्या जानना चाहते हैं?"
    },
    "mr": {
        "hello": "नमस्कार! मी एअरगार्ड एआय (AirGuard AI) आहे, तुमचा हवा गुणवत्ता मार्गदर्शक. आज मी तुम्हाला कशी मदत करू शकतो?",
        "pm2.5": "PM2.5 म्हणजे अत्यंत सूक्ष्म कण (Fine Particulate Matter) जे 2.5 मायक्रोमीटर किंवा त्यापेक्षा लहान असतात. ते थेट फुफ्फुसात आणि रक्तात जाऊन श्वसन व हृदयाचे आजार निर्माण करू शकतात.",
        "pm10": "PM10 म्हणजे 10 मायक्रोमीटरपेक्षा लहान असलेले धुलीकण. यामध्ये धूळ आणि परागकण येतात. यामुळे डोळे, नाक आणि घशात जळजळ होऊ शकते.",
        "grap": "ग्रॅप (GRAP - ग्रेडेड रिस्पॉन्स ॲक्शन प्लॅन) म्हणजे प्रदूषणाची तीव्रता पाहून प्रशासनाने आखलेले आपत्कालीन नियम आहेत. यात बांधकाम बंदी आणि ऑड-इव्हन वाहन नियमांचा समावेश होतो.",
        "mask": "हवेची गुणवत्ता खराब असल्यास (AQI > 150), N95 किंवा N99 मास्क वापरणे आवश्यक आहे. नेहमीचे कापडी मास्क PM2.5 रोखू शकत नाहीत.",
        "asthma": "दमा (Asthma) असलेल्या रुग्णांनी घराबाहेर जाणे टाळावे, इनहेलर सोबत ठेवावे आणि खोलीत एअर प्युरिफायर वापरावे.",
        "purifier": "घरातील हवेतील PM2.5 कमी करण्यासाठी HEPA एअर प्युरिफायर खूप प्रभावी आहेत. प्युरिफायर चालू असताना खिडक्या बंद ठेवाव्यात.",
        "default": "मी हवा प्रदूषण, आरोग्य सल्ला, ग्रॅप नियम आणि कार्बन फूटप्रिंट मोजण्यात मदत करू शकतो. तुम्हाला काय माहिती हवी आहे?"
    }
}

@router.post("/chatbot", response_model=ChatResponse)
def query_chatbot(req: ChatRequest):
    msg = req.message.lower()
    lang = req.language if req.language in RESPONSES else "en"
    db_responses = RESPONSES[lang]
    
    if "hello" in msg or "hi" in msg or "hey" in msg or "नमस्ते" in msg or "नमस्कार" in msg:
        resp = db_responses["hello"]
    elif "pm2.5" in msg or "pm25" in msg or "सूक्ष्म कण" in msg:
        resp = db_responses["pm2.5"]
    elif "pm10" in msg:
        resp = db_responses["pm10"]
    elif "grap" in msg or "ग्रैप" in msg or "नियम" in msg:
        resp = db_responses["grap"]
    elif "mask" in msg or "मास्क" in msg:
        resp = db_responses["mask"]
    elif "asthma" in msg or "दमा" in msg or "श्वास" in msg:
        resp = db_responses["asthma"]
    elif "purifier" in msg or "प्यूरिफायर" in msg or "प्युरिफायर" in msg:
        resp = db_responses["purifier"]
    else:
        resp = db_responses["default"]
        
    return ChatResponse(response=resp, language=lang)

@router.post("/carbon-calculator", response_model=CarbonCalculatorResponse)
def calculate_carbon_footprint(req: CarbonCalculatorRequest):
    res = calculate_carbon(req.vehicle_type, req.distance_km, req.passengers)
    return CarbonCalculatorResponse(**res)

@router.post("/green-route", response_model=RouteRecommendationResponse)
def recommend_green_route(req: RouteRecommendationRequest):
    res = calculate_green_route(req.start_lat, req.start_lng, req.end_lat, req.end_lng, req.mode)
    return RouteRecommendationResponse(**res)
