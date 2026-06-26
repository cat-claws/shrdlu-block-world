"""Compatibility shim for the browser-based SHRDLU viewer."""

from shrdlu_blocks.simulator.env import ShrdluBlocksEnv
from shrdlu_blocks.viewer.web import WebViewer, run_web_viewer


class Viewer(WebViewer):
    """Old ``Viewer`` name backed by the web viewer.

    The former constructor accepted a screen object first. The web viewer
    ignores that value and serves the scene over HTTP instead.
    """

    def __init__(self, screen=None, title: str = None, callback=None, initial_output: str = None,
                 env: ShrdluBlocksEnv = None):
        del callback
        if isinstance(screen, ShrdluBlocksEnv) and env is None:
            env = screen
        env = env or ShrdluBlocksEnv()
        super().__init__(
            env=env,
            title=title or 'SHRDLU Blocks',
            initial_output=initial_output or 'Ready.',
        )

    def run(self) -> None:
        self.serve()


__all__ = ['Viewer', 'WebViewer', 'run_web_viewer']
