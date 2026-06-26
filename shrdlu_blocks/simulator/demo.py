"""Standalone launchers for the simulator service."""

import argparse
import logging
import sys

from shrdlu_blocks.simulator.env import ShrdluBlocksEnv
from shrdlu_blocks.simulator.server import run_simulator_server
from shrdlu_blocks.viewer.web import run_web_viewer

__all__ = ['demo']


def demo(argv=None):
    """Run the simulator as either API-only or API plus browser viewer."""
    args = _parse_args(argv)
    env = ShrdluBlocksEnv()
    if args.headless:
        run_simulator_server(
            env,
            title='SHRDLU Blocks Simulator API',
            host=args.host,
            port=args.port,
        )
        return
    run_web_viewer(
        env,
        title='SHRDLU Blocks Simulator',
        host=args.host,
        port=args.port,
        open_browser=args.open_browser or None,
    )


def _parse_args(argv=None):
    parser = argparse.ArgumentParser(description='Run the SHRDLU Blocks simulator service.')
    parser.add_argument(
        '--headless',
        action='store_true',
        help='serve only the limited HTTP API, without the browser viewer',
    )
    parser.add_argument('--host', default=None, help='host/interface to bind')
    parser.add_argument('--port', type=int, default=None, help='port to bind')
    parser.add_argument(
        '--open-browser',
        action='store_true',
        help='open the browser viewer after starting the server',
    )
    return parser.parse_args(argv)


if __name__ == '__main__':
    logging.basicConfig(stream=sys.stdout, level=logging.INFO)
    demo()
