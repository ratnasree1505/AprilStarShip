import {createApiRef} from '@backstage/core-plugin-api'
import {CloudUtilsUser} from './CloudUtilsApi'

export type ManagementZone = {
    id: string;
    name: string;
}

export type DynatraceEntities = {
    entities: DynatraceEntity[];
}

export type DynatraceEntity = {
    entityId: string;
    displayName: string;
    name: string;
    managementZones: Array<ManagementZone>;
};

export type DynatraceProblem = {
    problemId: string;
    impactLevel: string;
    status: string;
    startTime: number;
    endTime: number;
    title: string;
    severityLevel: string;
    rootCauseEntity: DynatraceEntity;
    affectedEntities: Array<DynatraceEntity>;
};

export interface DynatraceProblems {
    problems: Array<DynatraceProblem>;
    totalCount: number;
    pageSize: number;
}

export type DynatraceMetrics = {
    totalCount: number;
    result: Array<DynatraceMetric>;
}

export type DynatraceMetric = {
    metricId: string;
    data: Array<DynatraceMetricDetail>
}

export type DynatraceMetricDetail = {
    dimensions: string[];
    dimensionsMap: object;
    timestamps: number[];
    values: number[];
}

export const dynatraceApiRef = createApiRef<DynatraceApi>({
    id: 'plugin.dynatrace.service',
})

export type DynatraceApi = {
    getDynatraceProblems(
        dynatraceEntityId: string,
    ): Promise<DynatraceProblems | undefined>;

    getCpuUsageForLastWeek(
        dynatraceEntityName: string,
    ): Promise<DynatraceMetric[] | undefined>;

    getMemoryUsageForLastWeek(
        dynatraceEntityName: string,
    ): Promise<DynatraceMetric[] | undefined>;

    getRecentCpuUsage(
        dynatraceEntityId: string,
    ): Promise<DynatraceMetricDetail | undefined>;

    getCpuRequest(
        dynatraceEntityName: string,
    ): Promise<DynatraceMetric[] | undefined>;

    getMemoryRequest(
        dynatraceEntityName: string,
    ): Promise<DynatraceMetric[] | undefined>;

    getRecentMemoryUsage(
        dynatraceEntityId: string,
    ): Promise<DynatraceMetricDetail | undefined>;

    getManagementZonesForUser(
        user: CloudUtilsUser | undefined,
    ): string[];

    isDynatraceEntityNameAuthorizedForUser(
        dynatraceEntities: DynatraceEntity[] | undefined,
        cloudUtilsUser: CloudUtilsUser | undefined
    ): Promise<boolean>;

    getDynatraceEntity(
        dynatraceEntityName: string,
    ): Promise<DynatraceEntities | undefined>;
};
