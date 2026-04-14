# Mocking Strategy

## When to Mock

- External API calls
- Database calls
- File system operations
- Time-dependent behavior
- Random number generation

## When NOT to Mock

- Internal modules you're testing
- Public interfaces
- Core business logic

## Mocking Best Practices

- Mock as close to the boundary as possible
- Use fakes instead of mocks when possible
- Keep mocks simple and predictable
- Document why a mock is needed
