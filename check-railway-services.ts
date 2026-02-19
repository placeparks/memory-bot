import { RailwayClient } from './lib/railway/client'
import { config } from 'dotenv'

config()

async function checkServices() {
  try {
    const railway = new RailwayClient()

    // Get all services
    const query = `
      query project($id: String!) {
        project(id: $id) {
          name
          services {
            edges {
              node {
                id
                name
                createdAt
                deployments(first: 1) {
                  edges {
                    node {
                      id
                      status
                      url
                      createdAt
                    }
                  }
                }
              }
            }
          }
        }
      }
    `

    const result = await (railway as any).graphql(query, {
      id: process.env.RAILWAY_PROJECT_ID
    })

    console.log('\n🚂 Railway Services Status:\n')
    console.log('Project:', result.project.name)
    console.log('─'.repeat(80))

    const services = result.project.services.edges

    if (services.length === 0) {
      console.log('No services found.')
    } else {
      services.forEach((edge: any) => {
        const service = edge.node
        const deployment = service.deployments.edges[0]?.node

        console.log(`\n📦 Service: ${service.name}`)
        console.log(`   ID: ${service.id}`)
        console.log(`   Created: ${new Date(service.createdAt).toLocaleString()}`)

        if (deployment) {
          console.log(`   Status: ${deployment.status}`)
          if (deployment.url) {
            console.log(`   URL: ${deployment.url}`)
          }
        } else {
          console.log(`   Status: No deployments`)
        }
      })
    }

    console.log('\n' + '─'.repeat(80))
    console.log(`Total services: ${services.length}\n`)

  } catch (error) {
    console.error('Error:', error)
  }
}

checkServices()
