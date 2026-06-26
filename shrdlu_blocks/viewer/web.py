"""HTTP-backed browser viewer for the SHRDLU blocks world."""

from __future__ import annotations

import os
import webbrowser
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import urlparse

from shrdlu_blocks.simulator.control import Controller
from shrdlu_blocks.simulator.env import ShrdluBlocksEnv
from shrdlu_blocks.simulator.scenes import Scene
from shrdlu_blocks.simulator.server import (
    DEFAULT_SIMULATOR_HOST,
    DEFAULT_SIMULATOR_PORT,
    SimulatorRequestHandler,
    SimulatorServer,
)

DEFAULT_WEB_HOST = DEFAULT_SIMULATOR_HOST
DEFAULT_WEB_PORT = DEFAULT_SIMULATOR_PORT

__all__ = [
    'DEFAULT_WEB_HOST',
    'DEFAULT_WEB_PORT',
    'WebViewer',
    'run_web_viewer',
]


class WebViewer(SimulatorServer):
    """Serve an interactive browser UI for a live ``ShrdluBlocksEnv``."""

    def __init__(
        self,
        env: Optional[ShrdluBlocksEnv] = None,
        title: str = 'SHRDLU Blocks',
        initial_output: str = 'Ready.',
    ):
        super().__init__(
            env=env,
            title=title,
            initial_output=initial_output,
        )

    def _handler_base_class(self):
        return WebViewerRequestHandler

    def _maybe_open_browser(self, url: str, open_browser: Optional[bool]) -> None:
        if open_browser is None:
            open_browser = os.environ.get('SHRDLU_WEB_OPEN_BROWSER', '').lower() in {
                '1',
                'true',
                'yes',
            }
        if open_browser:
            webbrowser.open(url)

    @property
    def scene(self) -> Scene:
        return self.env.scene

    @scene.setter
    def scene(self, scene: Scene) -> None:
        self.env._scene = scene
        self.env._controller = Controller(scene)

    def state_payload(self, output: Optional[str] = None) -> Dict[str, object]:
        with self._lock:
            payload = super().state_payload(output=output)
            payload['scene'] = scene_to_payload(self.env.scene)
            return payload


class WebViewerRequestHandler(SimulatorRequestHandler):
    """Request handler that adds static viewer assets to the simulator API."""

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path in ('', '/'):
            self._send_static('index.html', 'text/html; charset=utf-8')
            return
        if path == '/web_viewer.css':
            self._send_static('web_viewer.css', 'text/css; charset=utf-8')
            return
        if path == '/web_viewer.js':
            self._send_static('web_viewer.js', 'text/javascript; charset=utf-8')
            return
        super().do_GET()

    def _send_static(self, filename: str, content_type: str) -> None:
        path = Path(__file__).with_name('web_static') / filename
        try:
            data = path.read_bytes()
        except FileNotFoundError:
            self._send_text(404, 'Not found')
            return
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

def run_web_viewer(
    env: ShrdluBlocksEnv,
    title: str = 'SHRDLU Blocks',
    initial_output: str = 'Ready.',
    host: Optional[str] = None,
    port: Optional[int] = None,
    open_browser: Optional[bool] = None,
) -> None:
    viewer = WebViewer(
        env=env,
        title=title,
        initial_output=initial_output,
    )
    viewer.serve(host=host, port=port, open_browser=open_browser)


def scene_to_payload(scene: Scene) -> Dict[str, object]:
    return {
        'tags': _normalize_value(scene.tags),
        'objects': [_object_to_payload(obj) for obj in scene.objects],
    }


def _object_to_payload(obj) -> Dict[str, object]:
    return {
        'obj_id': _normalize_value(obj.tags.get('obj_id')),
        'kind': obj.tags.get('kind'),
        'color': {
            'name': obj.tags.get('color'),
            'rgb': _color_to_list(obj.color),
        },
        'position': _point_to_payload(obj.position),
        'tags': {
            key: _normalize_value(value)
            for key, value in sorted(obj.tags.items())
        },
        'surfaces': [
            [_point_to_payload(point) for point in _ordered_surface_points(surface)]
            for surface in obj.shape.surfaces
        ],
    }


def _ordered_surface_points(surface) -> List[object]:
    remaining_edges = set(surface.edges)
    if not remaining_edges:
        return []
    edge = remaining_edges.pop()
    points = [edge.start, edge.end]
    while remaining_edges:
        for edge in list(remaining_edges):
            if edge.start == points[-1]:
                points.append(edge.end)
                remaining_edges.remove(edge)
                break
            if edge.end == points[-1]:
                points.append(edge.start)
                remaining_edges.remove(edge)
                break
        else:
            points.extend(edge.start for edge in remaining_edges)
            break
    return points


def _point_to_payload(point) -> Dict[str, float]:
    return {
        'x': float(point.x),
        'y': float(point.y),
        'z': float(point.z),
    }


def _color_to_list(color) -> List[int]:
    return [int(color.red), int(color.green), int(color.blue)]


def _normalize_value(value):
    if hasattr(value, 'red') and hasattr(value, 'green') and hasattr(value, 'blue'):
        return _color_to_list(value)
    if hasattr(value, 'x') and hasattr(value, 'y') and hasattr(value, 'z'):
        return _point_to_payload(value)
    if isinstance(value, tuple):
        return [_normalize_value(item) for item in value]
    if isinstance(value, list):
        return [_normalize_value(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _normalize_value(item) for key, item in value.items()}
    if isinstance(value, int):
        return int(value)
    return value


if __name__ == '__main__':
    env = ShrdluBlocksEnv()
    run_web_viewer(
        env,
        title='SHRDLU Blocks Simulator',
    )
