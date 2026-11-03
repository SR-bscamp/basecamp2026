"""Model prices (USD per million tokens). Source: docs/CONTRACT.md, verified 2026-11-03."""

# model id -> (input, output, cache_write_5m, cache_read)
PRICING = {
    "claude-haiku-5-5": (0.10, 0.50, 0.125, 0.01),
    "claude-haiku-4-5": (1.00, 5.00, 1.25, 0.10),
    "claude-sonnet-5-5": (2.00, 10.00, 2.50, 0.10),
    "claude-sonnet-5": (2.00, 10.00, 2.50, 0.20),
    "claude-opus-5-5": (4.00, 20.00, 5.00, 0.20),
    "claude-opus-4-8": (5.00, 25.00, 6.25, 0.50),
}


def cost_usd(model: str, input_tokens: int, output_tokens: int,
             cache_write_tokens: int = 0, cache_read_tokens: int = 0) -> float:
    p_in, p_out, p_write, p_read = PRICING[model]
    return (input_tokens * p_in + output_tokens * p_out
            + cache_write_tokens * p_write + cache_read_tokens * p_read) / 1e6
