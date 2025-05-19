export interface TestResult {
    passed: number;
    blocked: number;
    unreachable: number;
    meanTimeToPass: number;
}

export function generateReport(
    testResults: Record<string, TestResult>,
): string {
    const table = `
<table>
    <thead>
        <tr>
            <th style="text-align: left">Test suite</th>
            <th>Passed</th>
            <th>Blocked</th>
            <th>Unreachable</th>
            <th>Mean time to pass</th>
        </tr>
    </thead>
    <tbody>
        ${Object.entries(testResults)
            .map(
                ([testName, testResult]) => `
        <tr>
            <td style="text-align: left"><b>${testName}</b></td>
            <td>${testResult.passed} ✅</td>
            <td>${testResult.blocked} ❌</td>
            <td>${testResult.unreachable} 🟡</td>
            <td>${Math.floor(testResult.meanTimeToPass)} ms</td>
        </tr>
        `,
            )
            .join('')}
    </tbody>
</table>
`;

    return `
<html>
<style>
    body {
        font-family: sans-serif;
    }
    #content {
        display: flex;
        justify-content: center;
        flex-direction: column;
        margin-left: 35%;
        width: 30%;
        border: 1px solid #ccc;
        border-radius: 5px;
        background-color: #eee;
    }
    table {
        border-collapse: collapse;
        width: 100%;
        border-top: 1px solid #ccc;
        border-bottom: 1px solid #ccc;
        padding: 10px;
    }
    th {
        border-bottom: 1px solid #ccc;
        padding: 10px;
        text-align: right;
    }
    td {
        padding: 10px;
        text-align: right;
    }
    tr {
        border-bottom: 1px solid #ddd;
    }
    tr:last-child {
        background-color: #ccefef;
    }
</style>
<body>
    <div id="content">
        <div style="width: 100%; text-align: right">
            <p>(${new Date().toDateString()})</p>
        </div>
        ${table}
    </div>
</body>
</html>    
`;
}
