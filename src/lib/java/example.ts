export const javaExample = `public class Main {
    static int sum(int[] values) {
        int total = 0;
        for (int i = 0; i < values.length; i++) {
            total += values[i];
        }
        return total;
    }

    public static void main(String[] args) {
        int[] values = {5, 1, 4, 2, 8};
        System.out.println(sum(values));
    }
}`;
