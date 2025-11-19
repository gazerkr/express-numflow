#!/usr/bin/env node

const autocannon = require('autocannon')
const { spawn } = require('child_process')
const path = require('path')

const WARMUP_DURATION = 5
const BENCHMARK_DURATION = 10
const CONNECTIONS = 100
const SERVER_READY_DELAY = 3000 // Wait 3 seconds after "running" message

const scenarios = [
  {
    name: 'Simple GET',
    method: 'GET',
    path: '/simple',
  },
  {
    name: 'POST with validation',
    method: 'POST',
    path: '/validate',
    body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
    headers: { 'Content-Type': 'application/json' },
  },
  {
    name: 'Complex multi-step (5 steps)',
    method: 'POST',
    path: '/complex',
    body: JSON.stringify({ productId: 1, quantity: 5 }),
    headers: { 'Content-Type': 'application/json' },
  },
  {
    name: '10-step processing',
    method: 'POST',
    path: '/ten-steps',
    body: JSON.stringify({ data: 'test data' }),
    headers: { 'Content-Type': 'application/json' },
  },
]

async function runBenchmark(serverType, port, scenario) {
  const url = `http://localhost:${port}${scenario.path}`

  console.log(`\n🔥 Warming up ${serverType} - ${scenario.name}...`)
  await autocannon({
    url,
    connections: CONNECTIONS,
    duration: WARMUP_DURATION,
    method: scenario.method || 'GET',
    body: scenario.body,
    headers: scenario.headers,
  })

  console.log(`\n📊 Running benchmark: ${serverType} - ${scenario.name}`)
  const result = await autocannon({
    url,
    connections: CONNECTIONS,
    duration: BENCHMARK_DURATION,
    method: scenario.method || 'GET',
    body: scenario.body,
    headers: scenario.headers,
  })

  return {
    serverType,
    scenario: scenario.name,
    requests: result.requests.total,
    throughput: result.throughput.total,
    latency: {
      mean: result.latency.mean,
      p50: result.latency.p50,
      p99: result.latency.p99,
      p999: result.latency.p99_9,
    },
    errors: result.errors,
  }
}

function startServer(serverPath, port) {
  return new Promise((resolve, reject) => {
    const server = spawn('node', [serverPath], {
      env: { ...process.env, PORT: port },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    server.stdout.on('data', (data) => {
      if (data.toString().includes('running')) {
        console.log(`  Server started, waiting ${SERVER_READY_DELAY}ms for route initialization...`)
        setTimeout(() => resolve(server), SERVER_READY_DELAY)
      }
    })

    server.stderr.on('data', (data) => {
      console.error(`Server error: ${data}`)
    })

    setTimeout(() => {
      reject(new Error('Server startup timeout'))
    }, 10000)
  })
}

function stopServer(server) {
  return new Promise((resolve) => {
    server.on('close', resolve)
    server.kill('SIGTERM')
    setTimeout(() => {
      server.kill('SIGKILL')
      resolve()
    }, 5000)
  })
}

function formatResults(results) {
  console.log('\n' + '='.repeat(80))
  console.log('📈 BENCHMARK RESULTS (Express 5.x)')
  console.log('='.repeat(80))

  const grouped = {}
  results.forEach((r) => {
    if (!grouped[r.scenario]) grouped[r.scenario] = {}
    grouped[r.scenario][r.serverType] = r
  })

  Object.keys(grouped).forEach((scenario) => {
    console.log(`\n📍 ${scenario}`)
    console.log('-'.repeat(80))

    const pure = grouped[scenario]['Pure Express']
    const numflow = grouped[scenario]['Numflow']

    console.log('\n  Pure Express:')
    console.log(`    Requests:      ${pure.requests.toLocaleString()} req`)
    console.log(`    Throughput:    ${(pure.throughput / 1024 / 1024).toFixed(2)} MB/s`)
    console.log(`    Latency (avg): ${pure.latency.mean.toFixed(2)} ms`)
    console.log(`    Latency (p50): ${pure.latency.p50.toFixed(2)} ms`)
    console.log(`    Latency (p99): ${pure.latency.p99.toFixed(2)} ms`)
    console.log(`    Errors:        ${pure.errors}`)

    console.log('\n  Express-Numflow:')
    console.log(`    Requests:      ${numflow.requests.toLocaleString()} req`)
    console.log(`    Throughput:    ${(numflow.throughput / 1024 / 1024).toFixed(2)} MB/s`)
    console.log(`    Latency (avg): ${numflow.latency.mean.toFixed(2)} ms`)
    console.log(`    Latency (p50): ${numflow.latency.p50.toFixed(2)} ms`)
    console.log(`    Latency (p99): ${numflow.latency.p99.toFixed(2)} ms`)
    console.log(`    Errors:        ${numflow.errors}`)

    const reqDiff = ((numflow.requests / pure.requests - 1) * 100).toFixed(2)
    const latDiff = ((numflow.latency.mean / pure.latency.mean - 1) * 100).toFixed(2)

    console.log('\n  📊 Comparison:')
    console.log(`    Requests:      ${reqDiff}% ${reqDiff >= 0 ? '🟢' : '🔴'}`)
    console.log(`    Latency (avg): ${latDiff}% ${latDiff <= 0 ? '🟢' : '🔴'}`)
  })

  console.log('\n' + '='.repeat(80))
}

async function main() {
  console.log('🚀 Starting benchmark suite...\n')

  const pureExpressPath = path.join(__dirname, 'fixtures/pure-express/server.js')
  const numflowPath = path.join(__dirname, 'fixtures/with-numflow/server.js')

  const results = []

  for (const scenario of scenarios) {
    // Pure Express
    console.log(`\n🔧 Starting Pure Express server...`)
    const pureServer = await startServer(pureExpressPath, 3001)
    const pureResult = await runBenchmark('Pure Express', 3001, scenario)
    results.push(pureResult)
    await stopServer(pureServer)

    // Numflow
    console.log(`\n🔧 Starting Numflow server...`)
    const numflowServer = await startServer(numflowPath, 3002)
    const numflowResult = await runBenchmark('Numflow', 3002, scenario)
    results.push(numflowResult)
    await stopServer(numflowServer)
  }

  formatResults(results)
}

main().catch((err) => {
  console.error('Benchmark failed:', err)
  process.exit(1)
})
