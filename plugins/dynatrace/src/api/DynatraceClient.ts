import {
    DynatraceApi,
    DynatraceEntities, DynatraceEntity, DynatraceMetric,
    DynatraceMetricDetail,
    DynatraceMetrics,
    DynatraceProblems,
} from './DynatraceApi'
import {DiscoveryApi, FetchApi} from '@backstage/core-plugin-api'
import {CloudUtilsUser} from './CloudUtilsApi'

export class DynatraceClient implements DynatraceApi {
    discoveryApi: DiscoveryApi
    fetchApi: FetchApi

    constructor({
                    discoveryApi,
                    fetchApi,
                }: {
        discoveryApi: DiscoveryApi;
        fetchApi: FetchApi;
    }) {
        this.discoveryApi = discoveryApi
        this.fetchApi = fetchApi
    }

    private async callApi<T>(
        path: string,
        query: { [key in string]: any },
    ): Promise<T | undefined> {
        const apiUrl = `${await this.discoveryApi.getBaseUrl('proxy')}/dynatrace`
        const response = await this.fetchApi.fetch(
            `${apiUrl}/${path}?${new URLSearchParams(query).toString()}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        )
        if (response.status === 200) {
            return (await response.json()) as T
        }
        throw new Error(
            `Dynatrace API call failed: ${response.status}:${response.statusText}`,
        )
    }

    async getDynatraceProblems(
        dynatraceEntityName: string,
    ): Promise<DynatraceProblems | undefined> {
        if (!dynatraceEntityName) {
            throw new Error('Dynatrace entity name is required')
        }

        return this.callApi('problems', {
            entitySelector: `type("CLOUD_APPLICATION"),entityName.equals(${dynatraceEntityName})`,
        })
    }

    async isDynatraceEntityNameAuthorizedForUser(
        dynatraceEntities: DynatraceEntity[] | undefined,
        user: CloudUtilsUser | undefined,
    ): Promise<boolean> {
        if (!dynatraceEntities) {
            throw new Error('Dynatrace entities are required')
        }

        if (!user) {
            throw new Error('User is required')
        }

        let authorized: boolean = false;

        const userManagementZones: string[] = this.getManagementZonesForUser(user)
        dynatraceEntities?.forEach(entity => {
            const authorizedEntities = entity.managementZones.filter(entityManagementZone => userManagementZones.includes(entityManagementZone.name))
            authorized = authorizedEntities.length > 0;
        })

        return authorized;
    }

    async getDynatraceEntity(
        dynatraceEntityName: string,
    ): Promise<DynatraceEntities | undefined> {
        if (!dynatraceEntityName) {
            throw new Error('Dynatrace entity name is required')
        }

        return await this.callApi('entities', {
            entitySelector: `type("CLOUD_APPLICATION"),entityName.in("${dynatraceEntityName}-dev","${dynatraceEntityName}-prod")`,
            fields: '+managementZones'
        })
    }

    getManagementZonesForUser(
        user: CloudUtilsUser | undefined,
    ): string[] {
        const managementZones: string[] = []
        user?.k8s.forEach((k8sEntity) => {
            managementZones.push([k8sEntity.cluster, k8sEntity.namespace].join('-'))
        })
        return managementZones
    }

    async getCpuRequest(
        dynatraceEntityName: string,
    ): Promise<DynatraceMetric[] | undefined> {
        if (!dynatraceEntityName) {
            throw new Error('Dynatrace entity name is required')
        }

        const metrics: DynatraceMetrics | undefined = await this.callApi('metrics/query', {
            metricSelector: `builtin:kubernetes.workload.requests_cpu:avg:splitBy("dt.entity.cloud_application"):parents:parents:filter(in("dt.entity.cloud_application",entitySelector("type(CLOUD_APPLICATION),entityName.in(${dynatraceEntityName}-dev,${dynatraceEntityName}-prod)")))`,
            resolution: '1h',
            from: 'now-1h',
        })

        return metrics?.result
    }

    async getMemoryRequest(
        dynatraceEntityName: string,
    ): Promise<DynatraceMetric[] | undefined> {
        if (!dynatraceEntityName) {
            throw new Error('Dynatrace entity name is required')
        }

        const metrics: DynatraceMetrics | undefined = await this.callApi('metrics/query', {
            metricSelector: `builtin:kubernetes.workload.requests_memory:avg:splitBy("dt.entity.cloud_application"):parents:parents:filter(in("dt.entity.cloud_application",entitySelector("type(CLOUD_APPLICATION),entityName.in(${dynatraceEntityName}-dev,${dynatraceEntityName}-prod)")))`,
            resolution: '1h',
            from: 'now-1h',
        })

        return metrics?.result
    }

    async getCpuUsageForLastWeek(
        dynatraceEntityName: string,
    ): Promise<DynatraceMetric[] | undefined> {

        const metrics: DynatraceMetrics | undefined = await this.callApi('metrics/query', {
            metricSelector: `((builtin:containers.cpu.usageMilliCores:avg:parents:parents:splitBy("dt.entity.cloud_application"):sum/builtin:kubernetes.workload.requests_cpu:avg:splitBy("dt.entity.cloud_application"):sum*100):splitBy("dt.entity.cloud_application"):avg):names:setUnit(Percent):parents:parents:filter(in("dt.entity.cloud_application",entitySelector("type(CLOUD_APPLICATION),entityName.in(${dynatraceEntityName}-dev,${dynatraceEntityName}-prod)")))`,
            resolution: 'Inf',
            from: 'now-1w',
        })

        return metrics?.result;
    }

    async getMemoryUsageForLastWeek(
        dynatraceEntityName: string,
    ): Promise<DynatraceMetric[] | undefined> {

        const metrics: DynatraceMetrics | undefined = await this.callApi('metrics/query', {
            metricSelector: `((builtin:containers.memory.residentSetBytes:avg:parents:parents:splitBy("dt.entity.cloud_application")/builtin:kubernetes.workload.requests_memory:avg:splitBy("dt.entity.cloud_application")*100):splitBy("dt.entity.cloud_application"):avg):names:setUnit(Percent):parents:parents:filter(in("dt.entity.cloud_application",entitySelector("type(CLOUD_APPLICATION),entityName.in(${dynatraceEntityName}-dev,${dynatraceEntityName}-prod)")))`,
            resolution: 'Inf',
            from: 'now-1w',
        })

        return metrics?.result;
    }

    async getRecentCpuUsage(
        dynatraceEntityId: string,
    ): Promise<DynatraceMetricDetail | undefined> {
        if (!dynatraceEntityId) {
            throw new Error('Dynatrace entity id is required')
        }

        const metrics: DynatraceMetrics | undefined = await this.callApi('metrics/query', {
            metricSelector: `((builtin:containers.cpu.usageMilliCores:avg:parents:parents:splitBy("dt.entity.cloud_application"):sum/builtin:kubernetes.workload.requests_cpu:avg:splitBy("dt.entity.cloud_application"):sum*100):splitBy("dt.entity.cloud_application"):avg):names:setUnit(Percent):parents:parents:filter(eq("dt.entity.cloud_application",${dynatraceEntityId}))`,
            resolution: '1d',
            from: 'now-1w',
        })

        return metrics?.result[0].data[0]
    }

    async getRecentMemoryUsage(
        dynatraceEntityId: string,
    ): Promise<DynatraceMetricDetail | undefined> {
        if (!dynatraceEntityId) {
            throw new Error('Dynatrace entity id is required')
        }

        const metrics: DynatraceMetrics | undefined = await this.callApi('metrics/query', {
            metricSelector: `((builtin:containers.memory.residentSetBytes:avg:parents:parents:splitBy("dt.entity.cloud_application")/builtin:kubernetes.workload.requests_memory:avg:splitBy("dt.entity.cloud_application")*100):splitBy("dt.entity.cloud_application"):avg):names:setUnit(Percent):parents:parents:filter(eq("dt.entity.cloud_application",${dynatraceEntityId}))`,
            resolution: '1d',
            from: 'now-1w',
        })

        return metrics?.result[0].data[0]
    }
}
