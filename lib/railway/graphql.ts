/**
 * Railway GraphQL API Client
 * https://docs.railway.app/reference/public-api
 */

const RAILWAY_API_URL = 'https://backboard.railway.app/graphql/v2'

interface RailwayExecResponse {
  exitCode: number
  output: string
  error?: string
}

export async function executeCommandInService(params: {
  serviceId: string
  command: string
  railwayToken: string
}): Promise<RailwayExecResponse> {
  const { serviceId, command, railwayToken } = params

  // First, get the active deployment for the service
  const deploymentQuery = `
    query GetActiveDeployment($serviceId: String!) {
      service(id: $serviceId) {
        id
        name
        deployments(first: 1, input: { status: { in: [SUCCESS, ACTIVE] } }) {
          edges {
            node {
              id
              status
              staticUrl
            }
          }
        }
      }
    }
  `

  try {
    const deploymentResponse = await fetch(RAILWAY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${railwayToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: deploymentQuery,
        variables: { serviceId }
      })
    })

    if (!deploymentResponse.ok) {
      throw new Error(`Railway API error: ${deploymentResponse.statusText}`)
    }

    const deploymentData = await deploymentResponse.json()

    if (deploymentData.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(deploymentData.errors)}`)
    }

    const deployment = deploymentData.data?.service?.deployments?.edges?.[0]?.node
    if (!deployment) {
      throw new Error('No active deployment found for this service')
    }

    // Execute command in the deployment
    const execMutation = `
      mutation DeploymentExec($deploymentId: String!, $command: String!) {
        deploymentExec(deploymentId: $deploymentId, command: $command) {
          exitCode
          output
        }
      }
    `

    const execResponse = await fetch(RAILWAY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${railwayToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: execMutation,
        variables: {
          deploymentId: deployment.id,
          command
        }
      })
    })

    if (!execResponse.ok) {
      throw new Error(`Railway API error: ${execResponse.statusText}`)
    }

    const execData = await execResponse.json()

    if (execData.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(execData.errors)}`)
    }

    const result = execData.data?.deploymentExec
    if (!result) {
      throw new Error('No result from deployment exec')
    }

    return {
      exitCode: result.exitCode,
      output: result.output
    }

  } catch (error: any) {
    return {
      exitCode: 1,
      output: '',
      error: error.message
    }
  }
}

export async function listPairingRequests(params: {
  serviceId: string
  channel: string
  railwayToken: string
}): Promise<{ success: boolean; output: string; error?: string }> {
  const command = `openclaw pairing list ${params.channel}`
  const result = await executeCommandInService({
    serviceId: params.serviceId,
    command,
    railwayToken: params.railwayToken
  })

  if (result.error || result.exitCode !== 0) {
    return {
      success: false,
      output: result.output,
      error: result.error || `Command failed with exit code ${result.exitCode}`
    }
  }

  return {
    success: true,
    output: result.output
  }
}

export async function approvePairing(params: {
  serviceId: string
  channel: string
  code: string
  railwayToken: string
}): Promise<{ success: boolean; output: string; error?: string }> {
  const command = `openclaw pairing approve ${params.channel} ${params.code}`
  const result = await executeCommandInService({
    serviceId: params.serviceId,
    command,
    railwayToken: params.railwayToken
  })

  if (result.error || result.exitCode !== 0) {
    return {
      success: false,
      output: result.output,
      error: result.error || `Command failed with exit code ${result.exitCode}`
    }
  }

  return {
    success: true,
    output: result.output
  }
}
