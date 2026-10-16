# Browser Java subset v1

CodeLens compiles a restricted, explicitly typed subset of Java to JavaScript and executes the result in the existing disposable browser worker. This is deterministic source compilation, not AI translation, AI simulation, a JVM, or support for arbitrary Java. The original editor text is preserved. Unsupported source produces a line-specific error; there is no automatic provider fallback.

## Supported source

- One class in the default package. Static methods with distinct names, including recursion and forward calls. Run requires `public static void main(String[] args)`. Main receives an empty argument array.
- `int`, `boolean`, `String`, and one-dimensional arrays of these types. Initialize every local at its declaration. Method parameters are typed. Null reference values, aliases and array identity comparisons work.
- Blocks, declarations, assignments, `if`/`else`, ordinary `for` and `while`, `break`, `continue` and `return`. Method return paths are checked conservatively; a value-returning method must have an explicit return on every recognized path.
- Decimal, binary and hexadecimal literals within the positive signed-int range, plus `-2147483648`. No octal literals, separators or numeric suffixes. Ordinary quoted strings with quote, backslash, tab, backspace, newline, form-feed and carriage-return escapes. No Java Unicode-escape preprocessing or text blocks.
- Signed 32-bit integer arithmetic, multiplication, division truncating toward zero, remainder, comparisons and bit operations. Overflow wraps, including increment, compound local assignments and the minimum-int division case. Integer division/remainder by zero throw. Postfix/prefix increments apply to locals; use a separate read and simple assignment for array updates.
- Boolean `!`, `&&`, `||` with short circuiting. Equality of scalar values and array references; use `.equals()` for strings, since string reference identity/interning is outside the subset.
- Checked array reads/writes and `.length`, initializers and `new int[n]`/`boolean[n]`/`String[n]`. Bounds, negative sizes and null receivers produce named Java-style errors. Each new array is limited to 100,000 elements. Strings produced by concatenation are limited to 100,000 UTF-16 code units.
- `System.out.print` and `println` for one scalar, and empty `println()`. `Arrays.toString` with `import java.util.Arrays;`. Integer `Math.min`, `Math.max`, `Math.abs` and decimal `Integer.parseInt`.
- `import java.util.Scanner;`, `new Scanner(System.in)`, `nextInt`, `next`, `nextLine`, `hasNextInt`, `hasNextLine`, `close`. The scanner reads only the supplied stdin string; decimal ASCII integer tokens and CR/LF line boundaries are supported. Scanner state is held in a runtime closure rather than embedded in snapshot data. Closing a scanner prevents further reads through its aliases.

Identifiers use ASCII JavaScript-compatible spelling. Names beginning with `__`, JavaScript reserved names, overloaded methods, local shadowing and declarations conflicting with built-in/method names are rejected. These are subset restrictions, not claims about the Java specification.

Unicode escapes are rejected throughout the source, including comments, because Java processes them before ordinary tokenization. They are never silently treated as harmless comment text.

## Unsupported source

Instance fields/methods and constructors, additional/nested classes, inheritance/interfaces, records/enums, generics/collections, multidimensional arrays, enhanced-for, do/while, switch, exceptions and try/catch, annotations, casts, ternaries, lambdas, method references, packages/wildcard imports, long/floating-point/char types, reflection, threads, files, network and external libraries are unsupported. Fully qualified library calls are also unsupported; use the documented imports. An empty or unsupported program is never silently interpreted as JavaScript.

## Feature integration and honest measurements

The compiler emits a typed, validated syntax tree with original Java line locations. The existing production instrumenter adds actual line/call/return hooks. Playback, breakpoints, output, variable and heap snapshots, aliases, recursion trees, applicable data-structure views and execution heatmaps use these real events. Specialized diagrams appear only when the supported program supplies evidence for that structure; unsupported Java collections/custom objects cannot supply such evidence.

Breakdown reads the compiler tree before instrumentation. Analysis supplies conservative candidates, often Unknown when runtime-helper calls prevent a reliable bound. Measurement accepts static methods with exactly one `int n`, `int[]`, or `String` parameter. It invokes the selected method with fresh inputs without running main, keeps the existing independent event/deadline/traversal budgets and stores counters rather than snapshots. The Big-O comparison, log axes and scale tables remain available.

Counts describe executed hooks at Java source locations. Memory units describe the compiled JavaScript data model, not Java object layouts, allocations, JVM bytes or native Java performance. No cross-language timing or memory equivalence is claimed. Fits remain estimates over the tested sizes.

Optional AI notes and advice accept original Java source and validated source-line/entry descriptors under the existing explicit controls. They never receive stdin, stdout or runtime values. Suggested tests are compiled and executed before offering a rerun; expected outputs and proposed optimized code remain unverified. A proposal outside the subset is rejected on Run rather than sent for simulation. Source-derived AI data for Java is not persisted by the analysis route.

## Privacy and execution boundary

Compilation, running, AST analysis, measurement and generated test execution require no JDK, compiler service, account, provider or new environment variable. No Java runtime CDN is loaded. Nothing is sent to a provider unless the user explicitly requests an existing AI action. The source and its compiled program are not written to browser storage or a hosted store by this feature. Share links still carry source/stdin in their URL fragment and require an explicit Run.

The worker keeps the established private nonce protocol, parent deadline, network/asynchronous-work restrictions and bounded trace handling. This adds no hostile-code isolation claim. The educational sandbox limitations documented in README and DECISIONS remain, including Python's builtins-importer bridge bypass.

## Verification scope

Compiler tests execute the real production instrumenter and tracer. Trusted, fixed accepted fixtures also compare stdout against local javac/JVM when a JDK is available; that differential check is skipped where no JDK exists. These checks cover examples, not proof of complete Java conformance. Browser stories use the production worker, existing measurement engine, offline/AI-disabled operation, error lines, stdin, playback, themes, mobile and no automatic POST uploads. Hosted services and deployment are outside this pass.
