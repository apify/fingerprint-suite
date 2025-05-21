from pathlib import Path


def get_browser_helper_file() -> Path:
    """Get path of `browser-helper-file.json`."""
    return Path(__file__).parent / "data" / "browser-helper-file.json"


def get_header_network() -> Path:
    """Get path of `header-network-definition.zip`."""
    return Path(__file__).parent / "data" / "header-network-definition.zip"


def get_headers_order() -> Path:
    """Get path of `headers-order.json`."""
    return Path(__file__).parent / "data" / "headers-order.json"


def get_input_network() -> Path:
    """Get path of `input-network-definition.zip`."""
    return Path(__file__).parent / "data" / "input-network-definition.zip"


def get_fingerprint_network() -> Path:
    """Get path of `fingerprint-network-definition.zip`."""
    return Path(__file__).parent / "data" / "fingerprint-network-definition.zip"
