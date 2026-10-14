import math
import cmath


def single_number(a):
    value = 0
    for item in a:
        value ^= item
    return value


def bit_count(value):
    """Nonnegative integer."""
    count = 0
    while value:
        value &= value - 1
        count += 1
    return count


def lowest_bit(value):
    return value & -value


def is_power_two(value):
    return value > 0 and value & (value - 1) == 0


def submasks(mask):
    result, subset = [], mask
    while True:
        result.append(subset)
        if subset == 0:
            return result
        subset = (subset - 1) & mask


def gray(bits):
    return [value ^ (value >> 1) for value in range(1 << bits)]


def reverse_bits(value, width):
    result = 0
    for _ in range(width):
        result = (result << 1) | (value & 1)
        value >>= 1
    return result


def xor_basis(values):
    basis = {}
    for value in values:
        while value:
            bit = value.bit_length() - 1
            if bit not in basis:
                basis[bit] = value
                break
            value ^= basis[bit]
    maximum = 0
    for bit in sorted(basis, reverse=True):
        maximum = max(maximum, maximum ^ basis[bit])
    return maximum


def gcd(a, b):
    while b:
        a, b = b, a % b
    return abs(a)


def extended_gcd(a, b):
    old_r, r, old_x, x, old_y, y = a, b, 1, 0, 0, 1
    while r:
        quotient = old_r // r
        old_r, r = r, old_r - quotient * r
        old_x, x = x, old_x - quotient * x
        old_y, y = y, old_y - quotient * y
    return [old_r, old_x, old_y]


def sieve(n):
    prime = [True] * (n + 1)
    if n >= 0:
        prime[0] = False
    if n >= 1:
        prime[1] = False
    for value in range(2, math.isqrt(n) + 1):
        if prime[value]:
            for composite in range(value * value, n + 1, value):
                prime[composite] = False
    return [i for i, eligible in enumerate(prime) if eligible]


def linear_sieve(n):
    smallest, primes = [0] * (n + 1), []
    for value in range(2, n + 1):
        if smallest[value] == 0:
            smallest[value] = value
            primes.append(value)
        for prime in primes:
            if prime > smallest[value] or prime * value > n:
                break
            smallest[prime * value] = prime
    return primes


def segmented_sieve(left, right):
    prime = [True] * (right - left + 1)
    for p in sieve(math.isqrt(right)):
        start = max(p * p, ((left + p - 1) // p) * p)
        for composite in range(start, right + 1, p):
            prime[composite - left] = False
    return [value for value in range(left, right + 1) if value >= 2 and prime[value - left]]


def factorization(n):
    result, divisor = [], 2
    while divisor * divisor <= n:
        while n % divisor == 0:
            result.append(divisor)
            n //= divisor
        divisor += 1
    if n > 1:
        result.append(n)
    return result


def miller_rabin(n):
    """Deterministic for 0 <= n < 2**64 with this witness set."""
    if n < 2:
        return False
    for prime in [2,3,5,7,11,13,17,19,23,29,31,37]:
        if n % prime == 0:
            return n == prime
    odd, shifts = n - 1, 0
    while odd % 2 == 0:
        odd //= 2
        shifts += 1
    for witness in [2,325,9375,28178,450775,9780504,1795265022]:
        if witness % n == 0:
            continue
        value = pow(witness, odd, n)
        if value in (1, n - 1):
            continue
        for _ in range(shifts - 1):
            value = value * value % n
            if value == n - 1:
                break
        else:
            return False
    return True


def pollard_rho(n):
    """Find one factor; deterministic retry constants, 1 < n < 2**64."""
    if n % 2 == 0:
        return 2
    if miller_rabin(n):
        return n
    constant = 1
    while True:
        slow = fast = 2
        divisor = 1
        while divisor == 1:
            slow = (slow * slow + constant) % n
            fast = (fast * fast + constant) % n
            fast = (fast * fast + constant) % n
            divisor = gcd(abs(slow - fast), n)
        if divisor != n:
            return divisor
        constant += 1


def modular_power(base, exponent, modulus):
    result = 1 % modulus
    while exponent:
        if exponent & 1:
            result = result * base % modulus
        base = base * base % modulus
        exponent >>= 1
    return result


def inverse(value, modulus):
    divisor, coefficient, other = extended_gcd(value, modulus)
    if divisor != 1:
        raise ValueError('Inverse does not exist')
    return coefficient % modulus


def crt(congruences):
    """Generalized CRT, including compatible non-coprime positive moduli."""
    value, modulus = 0, 1
    for residue, next_modulus in congruences:
        divisor, coefficient, other = extended_gcd(modulus, next_modulus)
        difference = residue - value
        if difference % divisor:
            raise ValueError('Incompatible congruences')
        multiplier = difference // divisor * coefficient % (next_modulus // divisor)
        value += modulus * multiplier
        modulus *= next_modulus // divisor
        value %= modulus
    return [value, modulus]


def totient(n):
    result, divisor = n, 2
    while divisor * divisor <= n:
        if n % divisor == 0:
            result -= result // divisor
            while n % divisor == 0:
                n //= divisor
        divisor += 1
    if n > 1:
        result -= result // n
    return result


def pascal(rows):
    result = []
    for row in range(rows):
        line = [1] * (row + 1)
        for col in range(1, row):
            line[col] = result[-1][col - 1] + result[-1][col]
        result.append(line)
    return result


def binomial(n, k, prime):
    """0 <= k <= n and a prime modulus greater than n."""
    factorial = [1]
    for i in range(1, n + 1):
        factorial.append(factorial[-1] * i % prime)
    return factorial[n] * pow(factorial[k] * factorial[n - k] % prime, prime - 2, prime) % prime


def inclusion_exclusion(bound, divisors):
    """Count positive integers <= bound divisible by at least one divisor."""
    total = 0
    for mask in range(1, 1 << len(divisors)):
        multiple = 1
        for i, divisor in enumerate(divisors):
            if mask & (1 << i):
                multiple = math.lcm(multiple, divisor)
        total += (1 if mask.bit_count() % 2 else -1) * (bound // multiple)
    return total


def matrix_multiply(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(len(b))) for j in range(len(b[0]))] for i in range(len(a))]


def matrix_power(matrix, exponent):
    result = [[int(i == j) for j in range(len(matrix))] for i in range(len(matrix))]
    while exponent:
        if exponent & 1:
            result = matrix_multiply(result, matrix)
        matrix = matrix_multiply(matrix, matrix)
        exponent >>= 1
    return result


def gaussian(coefficients, constants):
    """Square nonsingular linear system; partial pivoting, tolerance 1e-12."""
    matrix = [list(map(float, row)) + [float(value)] for row, value in zip(coefficients, constants)]
    n = len(matrix)
    for col in range(n):
        pivot = max(range(col, n), key=lambda row: abs(matrix[row][col]))
        if abs(matrix[pivot][col]) < 1e-12:
            raise ValueError('Singular system')
        matrix[col], matrix[pivot] = matrix[pivot], matrix[col]
        scale = matrix[col][col]
        matrix[col] = [value / scale for value in matrix[col]]
        for row in range(n):
            if row != col:
                scale = matrix[row][col]
                matrix[row] = [matrix[row][j] - scale * matrix[col][j] for j in range(n + 1)]
    return [row[-1] for row in matrix]


def fft(values, inverse_transform=False):
    """Power-of-two length; forward convention exp(-2*pi*i/n)."""
    n = len(values)
    if n == 1:
        return [complex(values[0])]
    even, odd = fft(values[::2], inverse_transform), fft(values[1::2], inverse_transform)
    result = [0j] * n
    for i in range(n // 2):
        angle = (2 if inverse_transform else -2) * math.pi * i / n
        rotated = cmath.exp(1j * angle) * odd[i]
        result[i], result[i + n // 2] = even[i] + rotated, even[i] - rotated
        if inverse_transform:
            result[i] /= 2
            result[i + n // 2] /= 2
    return result


def ntt(values, inverse_transform=False):
    """Power-of-two length <= 2**23 over prime 998244353, primitive root 3."""
    modulus, a, n = 998244353, list(values), len(values)
    j = 0
    for i in range(1, n):
        bit = n >> 1
        while j & bit:
            j ^= bit
            bit >>= 1
        j ^= bit
        if i < j:
            a[i], a[j] = a[j], a[i]
    length = 2
    while length <= n:
        root = pow(3, (modulus - 1) // length, modulus)
        if inverse_transform:
            root = pow(root, modulus - 2, modulus)
        for start in range(0, n, length):
            factor = 1
            for i in range(start, start + length // 2):
                first, second = a[i], a[i + length // 2] * factor % modulus
                a[i], a[i + length // 2] = (first + second) % modulus, (first - second) % modulus
                factor = factor * root % modulus
        length *= 2
    if inverse_transform:
        scale = pow(n, modulus - 2, modulus)
        a = [value * scale % modulus for value in a]
    return a


def convolution(a, b):
    size = 1
    while size < len(a) + len(b) - 1:
        size *= 2
    first = fft(list(a) + [0] * (size - len(a)))
    second = fft(list(b) + [0] * (size - len(b)))
    product = fft([x * y for x, y in zip(first, second)], True)
    return [round(value.real) for value in product[:len(a) + len(b) - 1]]


def walsh(values, inverse_transform=False):
    """XOR Walsh–Hadamard transform; power-of-two length."""
    a, width = list(values), 1
    while width < len(a):
        for start in range(0, len(a), 2 * width):
            for i in range(start, start + width):
                first, second = a[i], a[i + width]
                a[i], a[i + width] = first + second, first - second
        width *= 2
    return [value / len(a) for value in a] if inverse_transform else a


DEMOS = {
    'single-number-with-xor': ('single_number([4,1,2,1,2])', 4),
    'brian-kernighan-bit-counting': ('bit_count(13)', 3),
    'lowest-set-bit-extraction': ('lowest_bit(12)', 4),
    'power-of-two-test': ('is_power_two(16)', True),
    'enumerate-submasks': ('submasks(5)', [5,4,1,0]),
    'gray-code-generation': ('gray(2)', [0,1,3,2]),
    'bit-reversal': ('reverse_bits(3, 4)', 12),
    'xor-linear-basis': ('xor_basis([1,2,3])', 3),
    'euclidean-gcd': ('gcd(48,18)', 6),
    'extended-euclidean-algorithm': ('extended_gcd(30, 18)', [6,-1,2]),
    'sieve-of-eratosthenes': ('sieve(20)', [2,3,5,7,11,13,17,19]),
    'linear-sieve': ('linear_sieve(20)', [2,3,5,7,11,13,17,19]),
    'segmented-sieve': ('segmented_sieve(10,20)', [11,13,17,19]),
    'trial-division-factorization': ('factorization(84)', [2,2,3,7]),
    'miller-rabin-primality-test': ('[miller_rabin(97), miller_rabin(91)]', [True,False]),
    'pollard-rho-factorization': ('pollard_rho(91)', 7),
    'modular-exponentiation': ('modular_power(3, 5, 7)', 5),
    'modular-inverse': ('inverse(3, 11)', 4),
    'chinese-remainder-theorem-construction': ('crt([(2,3),(3,5),(2,7)])', [23,105]),
    'euler-totient-computation': ('totient(12)', 4),
    'pascal-triangle': ('pascal(4)', [[1],[1,1],[1,2,1],[1,3,3,1]]),
    'factorial-based-binomial-coefficients': ('binomial(5, 2, 101)', 10),
    'inclusion-exclusion': ('inclusion_exclusion(10, [2,3])', 7),
    'matrix-exponentiation': ('matrix_power([[1,1],[1,0]], 5)', [[8,5],[5,3]]),
    'gaussian-elimination': ('gaussian([[2,1],[1,-1]], [5,1])', [2.0,1.0]),
    'fast-fourier-transform': ('[[round(z.real,6),round(z.imag,6)] for z in fft([1,2,3,4])]', [[10.0,0.0],[-2.0,2.0],[-2.0,0.0],[-2.0,-2.0]]),
    'number-theoretic-transform': ('ntt(ntt([1,2,3,4]), True)', [1,2,3,4]),
    'polynomial-convolution': ('convolution([1,2], [3,4])', [3,10,8]),
    'fast-walsh-hadamard-transform': ('walsh([1,2,3,4])', [10,-2,-4,0]),
}
