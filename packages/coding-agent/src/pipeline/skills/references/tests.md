# Test Guidance

## Writing Testable Code

- Test behavior through the public interface, not implementation details
- One test per behavior
- Keep tests focused and readable
- Use setup/teardown to reduce duplication

## Test Organization

- Arrange → Act → Assert
- Given → When → Then
- Test one thing per test

## Avoiding Common Pitfalls

- Don't mock internal methods
- Don't test implementation details
- Don't make tests tightly coupled to code structure
