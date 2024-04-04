import React, {useState} from 'react'
import {Grid} from '@material-ui/core'
import {Content, Page, Progress, ResponseErrorPanel, WarningPanel} from '@backstage/core-components'
import {useEntity} from '@backstage/plugin-catalog-react'
import {ProblemsList} from '../Problems/ProblemsList'
import {UtilizationMetrics} from '../UtilizationMetrics'
import {githubAuthApiRef, oktaAuthApiRef, useApi} from '@backstage/core-plugin-api'
import {cloudUtilsApiRef} from '../../api/CloudUtilsApi'
import {dynatraceApiRef, DynatraceEntity} from '../../api'
import {useAsync} from 'react-use'

export const DynatraceTab = () => {
    const {entity} = useEntity()
    const dynatraceApi = useApi(dynatraceApiRef)
    const cloudUtilsApi = useApi(cloudUtilsApiRef)
    const githubAuthApi = useApi(githubAuthApiRef)
    const oktaAuthApi = useApi(oktaAuthApiRef)
    const [dynatraceEntities, setDynatraceEntities] = useState<DynatraceEntity[]>([]);

    const entityName: string = entity?.metadata.name

    const {value, loading, error} = useAsync(async () => {
        const githubAuth = await githubAuthApi.getProfile({optional: true});
        const oktaAuth = await oktaAuthApi.getProfile({optional: true});
        const email = oktaAuth?.email?.split("@")[0] || githubAuth?.email;
        const cloudUtilsUser = await cloudUtilsApi.getUserLookup(email);
        const dynatraceEntitiesResponse = await dynatraceApi.getDynatraceEntity(entityName);

        setDynatraceEntities(dynatraceEntitiesResponse?.entities || []);

        return await dynatraceApi.isDynatraceEntityNameAuthorizedForUser(
            dynatraceEntitiesResponse?.entities,
            cloudUtilsUser
        );
    })

    const entityAuthorized = value;


    if (loading) {
        return <Progress/>
    } else if (error) {
        return <ResponseErrorPanel error={error}/>
    }

    return (
        <Page themeId="tool">
            <Content>
                <Grid container spacing={2}>
                    {!entityAuthorized && <WarningPanel title="You do not have access to this resource in dynatrace"/>}
                    {entityAuthorized && (
                        <>
                            <Grid item xs={12} lg={12}>
                                <ProblemsList />
                            </Grid>
                            <Grid item xs={12} lg={12}>
                                <UtilizationMetrics dynatraceEntities={dynatraceEntities}/>
                            </Grid>
                        </>
                    )}
                </Grid>
            </Content>
        </Page>
    )
}
