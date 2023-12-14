import os
import logging
import base64
from dotenv import load_dotenv

load_dotenv()

from pydantic import BaseModel
from fastapi import FastAPI, Request
from starlette.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from langchain_community.embeddings import OpenAIEmbeddings
from langchain.chains.question_answering import load_qa_chain
from langchain.llms import OpenAI
from langchain.vectorstores import Pinecone
import pinecone

app = FastAPI(
    title="LangChain Server",
    version="1.0",
    description="A simple API server using LangChain's Runnable interfaces",
    docs_url=None,
    redoc_url=None
)

origins = [
    "https://container-service-2.5baebl44cbuki.us-west-2.cs.amazonlightsail.com",
    "http://container-service-2.5baebl44cbuki.us-west-2.cs.amazonlightsail.com",
    "http://localhost:3000",
    "http://localhost"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def check_permission(method, api, auth):
    try:
        scheme, data = (auth or ' ').split(' ', 1)
        if scheme != 'Basic':
            return False

        # Add necessary padding
        padding_needed = 4 - (len(data) % 4)
        if padding_needed and padding_needed != 4:
            data += '=' * padding_needed

        username, password = base64.b64decode(data).decode().split(':', 1)
        return username == os.getenv("GUEST_NAME") and password == os.getenv("GUEST_PASSWORD")
    except Exception as e:
        logging.warning(f"Error checking permissions: {e}")
        return False


@app.middleware("http")
async def check_authentication(request: Request, call_next):
    auth = request.headers.get('Authorization')
    try:
        if not check_permission(request.method, request.url.path, auth):
            logging.warning(f"Unauthorized access attempt to {request.url.path}")
            return JSONResponse(content={"detail": "Invalid credentials"}, status_code=401,
                                headers={"WWW-Authenticate": "Basic"})
    except ValueError:
        logging.warning(f"Invalid authentication header: {auth}")
        return JSONResponse(content={"detail": "Invalid authentication header"}, status_code=401,
                            headers={"WWW-Authenticate": "Basic"})
    return await call_next(request)


# LangChain stuff

pinecone.init(api_key=os.getenv("PINECONE_API_KEY"), environment=os.getenv("PINECONE_ENVIRONMENT"))

db = Pinecone
llm = OpenAI(temperature=0.5, max_tokens=800, top_p=1.0)
chain = load_qa_chain(llm, chain_type="stuff", verbose=False)
embeddings = OpenAIEmbeddings()
docsearch = Pinecone.from_existing_index(index_name=os.getenv("PINECONE_INDEX_NAME"), embedding=embeddings)


class Input(BaseModel):
    input: str


@app.post("/invoke")
def invoke(user_input: Input):
    results = docsearch.similarity_search(query=user_input.input, k=15)
    return {"output": chain.run(input_documents=results, question=user_input.input)}
