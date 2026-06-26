# SHRDLU Block World

Small standalone tabletop blocks-world simulator. It can run as a Python object,
a headless HTTP service, or a browser viewer for manual control.

The distribution name is `shrdlu-block-world`; the import package is
`shrdlu_blocks`. It has no third-party runtime dependencies.

## Install

```bash
cd ~/shrdlu-block-world
python3 -m pip install -e .
```

## Run

```bash
# Browser viewer at http://127.0.0.1:8000/
shrdlu-block-world

# API only
shrdlu-block-world --headless
```

Useful options:

- `--host HOST`
- `--port PORT`
- `--open-browser`

You can also run the module directly:

```bash
python3 -m shrdlu_blocks.simulator
```

## Python API

```python
from shrdlu_blocks import ShrdluBlocksEnv

env = ShrdluBlocksEnv()
env.execute_action({"name": "move_grasper", "args": {"x": -0.1, "y": 0.4}})
env.execute_action({"name": "lower_grasper", "args": {}})
print(env.snapshot_text())
```

## HTTP API

- `GET /api/state`
- `POST /api/action`
- `POST /api/reset`

`POST /api/action` expects an action object:

```json
{
  "action": {
    "name": "move_grasper",
    "args": {"x": -0.1, "y": 0.4}
  }
}
```

Supported action names:

- `move_grasper` with `x` and `y`
- `lower_grasper`
- `raise_grasper`
- `close_grasper`
- `open_grasper`
- `highlight_object`
- `unhighlight_object`

## Configuration

```bash
export SHRDLU_SIMULATOR_HOST=0.0.0.0
export SHRDLU_SIMULATOR_PORT=8000
export SHRDLU_WEB_OPEN_BROWSER=1
```

For remote use, forward the viewer port and open `http://localhost:8000`:

```bash
ssh -L 8000:localhost:8000 user@remote-host
```

## Layout

- `shrdlu_blocks/simulator/`: environment, controller, scene model, and HTTP server
- `shrdlu_blocks/viewer/`: browser viewer and static assets
- `shrdlu_blocks/client.py`: small HTTP client for a running service
