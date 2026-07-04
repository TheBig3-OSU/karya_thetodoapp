from app import hello


def test_hello_returns_string():
    assert isinstance(hello(), str)


def test_hello_world():
    assert hello() == "Hello, World!"
