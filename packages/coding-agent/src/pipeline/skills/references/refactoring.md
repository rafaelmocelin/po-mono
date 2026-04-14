# Refactoring

## Refactoring Process

1. All tests pass
2. Identify duplication or unclear code
3. Make one small change
4. Run tests
5. Commit if tests pass
6. Repeat

## Refactoring Patterns

### Extract Function
- Identify repeated or complex logic
- Extract to new function with clear name
- Update all call sites
- Test thoroughly

### Extract Class/Module
- Group related functionality
- Reduce responsibility of existing class
- Move tests to new location

### Simplify Logic
- Remove unnecessary conditions
- Use clearer variable names
- Reduce cyclomatic complexity

## Never Skip Tests

- Refactoring MUST keep tests green
- If tests fail, revert the refactoring
- Tests are your safety net
