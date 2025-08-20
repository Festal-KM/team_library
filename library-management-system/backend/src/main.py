from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title=""社内図書館管理システム"", version=""1.0.0"")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=[""*""],
    allow_credentials=True,
    allow_methods=[""*""],
    allow_headers=[""*""],
)

@app.get(""/"")
async def root():
    return {""message"": ""社内図書館管理システム稼働中"", ""status"": ""running""}

@app.get(""/health"")
async def health():
    return {""status"": ""ok"", ""message"": ""システム正常稼働中""}

if __name__ == ""__main__"":
    import uvicorn
    uvicorn.run(app, host=""0.0.0.0"", port=8000)
