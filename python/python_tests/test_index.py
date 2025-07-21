"""
Test the basic functionality of the converted Python package.

This test file corresponds to the original index.spec.ts
"""

import sys
import os

# Add the current directory to the Python path
current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, current_dir)

from python.python_src import my_package


def test_my_package():
    """Test that myPackage returns a string containing the message."""
    message = 'Hello'
    
    result = my_package(message)
    
    assert message in result
    assert result == f"{message} from my package"


def test_my_package_empty():
    """Test myPackage with empty string."""
    result = my_package()
    
    assert result == " from my package"


def test_my_package_with_taco():
    """Test myPackage with 'taco' message."""
    message = 'taco'
    
    result = my_package(message)
    
    assert message in result
    assert result == "taco from my package"


if __name__ == '__main__':
    test_my_package()
    test_my_package_empty() 
    test_my_package_with_taco()
    print("✅ All basic package tests passed!")
