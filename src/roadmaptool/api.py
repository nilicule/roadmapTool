import io
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import PlainTextResponse

from roadmaptool.models import Roadmap
from roadmaptool.parser import _yaml

router = APIRouter()


@router.post("/roadmap/import")
async def import_roadmap(request: Request):
    body = await request.body()
    try:
        raw = _yaml.load(body.decode("utf-8"))
        roadmap = Roadmap.model_validate(raw)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
    return roadmap.model_dump(mode="json")


@router.post("/roadmap/export", response_class=PlainTextResponse)
def export_roadmap(rm: Roadmap):
    buf = io.StringIO()
    _yaml.dump(rm.model_dump(mode="json"), buf)
    return PlainTextResponse(
        content=buf.getvalue(),
        media_type="text/yaml",
        headers={"Content-Disposition": "attachment; filename=roadmap.yaml"}
    )
