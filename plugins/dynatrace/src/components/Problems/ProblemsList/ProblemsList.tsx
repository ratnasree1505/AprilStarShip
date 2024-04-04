import React from 'react'
import useAsync from 'react-use/lib/useAsync'
import {EmptyState, InfoCard, Progress, ResponseErrorPanel} from '@backstage/core-components'
import {configApiRef, useApi} from '@backstage/core-plugin-api'
import {ProblemsTable} from '../ProblemsTable'
import {dynatraceApiRef, DynatraceProblem} from '../../../api'
import {useEntity} from '@backstage/plugin-catalog-react'

const cardContents = (
    problems: DynatraceProblem[],
    dynatraceBaseUrl: string,
) => {
    return problems.length ? (
        <ProblemsTable
            problems={problems || []}
            dynatraceBaseUrl={dynatraceBaseUrl}
        />
    ) : (
        <EmptyState title="No Problems to Report!" missing="data"/>
    )
}

export const ProblemsList = () => {
    const {entity} = useEntity();
    const configApi = useApi(configApiRef)
    const dynatraceApi = useApi(dynatraceApiRef)
    const dynatraceBaseUrl = configApi.getString('dynatrace.baseUrl')

    const entityName: string = entity?.metadata.name

    const {value, loading, error} = useAsync(async () => {
        return dynatraceApi.getDynatraceProblems(entityName)
    }, [dynatraceApi, entityName])

    const problems = value?.problems

    return (
        <InfoCard
            title="Problems"
            subheader="Last 2 hours"
        >
            {loading && <Progress/>}
            {error && <ResponseErrorPanel error={error}/>}
            {!loading && !error &&
                cardContents(problems || [], dynatraceBaseUrl)}
        </InfoCard>
    )
}
