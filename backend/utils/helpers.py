"""
Utility helper functions
"""

def ordinal_suffix(n):
    """
    Add ordinal suffix to a number (1st, 2nd, 3rd, etc.)
    
    Args:
        n: Integer to format
        
    Returns:
        String with ordinal suffix (e.g., "1st", "22nd")
    """
    if 10 <= n % 100 <= 20:
        suffix = 'th'
    else:
        suffix = {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')
    return f"{n}{suffix}"


def safe_divide(numerator, denominator, default=0):
    """
    Safely divide two numbers, returning default if denominator is 0
    
    Args:
        numerator: Number to divide
        denominator: Number to divide by
        default: Default value if denominator is 0
        
    Returns:
        Result of division or default
    """
    return numerator / denominator if denominator != 0 else default
