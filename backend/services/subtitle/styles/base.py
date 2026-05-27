from abc import ABC, abstractmethod

class SubtitleStyle(ABC):
    @abstractmethod
    def process(self, text: str, context: str = "general") -> str:
        """Process and style the subtitle text based on context."""
        pass

    @abstractmethod
    def get_name(self) -> str:
        """Return the name of the style."""
        pass
