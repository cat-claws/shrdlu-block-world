"""
SHRDLU: A simple environment for evaluating and testing natural language understanding systems
"""

from shrdlu_blocks.simulator import ShrdluBlocksEnv, SimulatorServer, run_simulator_server
from shrdlu_blocks.client import DEFAULT_SIMULATOR_URL, ShrdluBlocksClient

__version__ = '0.1.0'
__author__ = 'Aaron Hosford'

__all__ = [
    'DEFAULT_SIMULATOR_URL',
    'ShrdluBlocksClient',
    'ShrdluBlocksEnv',
    'SimulatorServer',
    'run_simulator_server',
]
