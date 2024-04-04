import React, {useEffect, useState} from 'react'
import useAsync from 'react-use/lib/useAsync'
import {InfoCard, Progress, ResponseErrorPanel} from '@backstage/core-components'
import {useApi} from '@backstage/core-plugin-api'
import {dynatraceApiRef, DynatraceEntity} from '../../api'
import {CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis} from 'recharts'
import {
    Collapse,
    Grid,
    IconButton,
    makeStyles,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@material-ui/core'
import {Alert, AlertTitle} from '@material-ui/lab'
import {useEntity} from '@backstage/plugin-catalog-react'
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp'
import Warning from '@material-ui/icons/Warning'
import classNames from 'classnames'

const dayjs = require('dayjs')

type UtilizationMetricsProps = {
    dynatraceEntities: DynatraceEntity[],
}

type DataRow = {
    name: string,
    dynatraceEntityId: string,
    managementZone: string,
    cpuRequests: number,
    cpuUtilization: number,
    memoryRequests: number,
    memoryUtilization: number,
}

const useStyles = makeStyles({
    root: {
        '& > *': {
            borderBottom: 'unset',
        },
        '& th': {
            fontWeight: 'bold',
        },
        '& .below-threshold': {
            color: 'red',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'right',
            alignItems: 'center',
        },
    },
    graphs: {
        padding: '2em',
    }
})

export const UtilizationMetrics = ({dynatraceEntities}: UtilizationMetricsProps) => {
    const MEMORY_UTILIZATION_THRESHOLD = 50
    const CPU_UTILIZATION_THRESHOLD = 50

    const classes = useStyles()
    const {entity} = useEntity()
    const entityName: string = entity?.metadata.name

    const dynatraceApi = useApi(dynatraceApiRef)
    const [selectedDynatraceEntityId, setSelectedDynatraceEntityId] = useState<string | undefined>()
    const [rows, setRows] = useState<DataRow[]>([])
    const [recentCpuUsage, setRecentCpuUsage] = useState<object[]>([])
    const [recentMemoryUsage, setRecentMemoryUsage] = useState<object[]>([])

    const createData = (
        name: string,
        dynatraceEntityId: string,
        managementZone: string,
        cpuRequests: number,
        cpuUtilization: number,
        memoryRequests: number,
        memoryUtilization: number,
    ) => {
        return {
            name,
            dynatraceEntityId,
            managementZone,
            cpuRequests,
            cpuUtilization: cpuUtilization,
            memoryRequests: (memoryRequests / 1048576),
            memoryUtilization: memoryUtilization,
        }
    }

    useEffect(() => {
        if (selectedDynatraceEntityId) {
            const recentCpuUsages: object[] = []
            dynatraceApi.getRecentCpuUsage(selectedDynatraceEntityId).then(recentCpuUsageFromDynatrace => {
                recentCpuUsageFromDynatrace?.values.forEach((value, index) => {
                    if (!!value) {
                        recentCpuUsages.push(
                            {
                                cpuUsage: value.toFixed(2),
                                timestamp: dayjs(recentCpuUsageFromDynatrace.timestamps[index]).format('ddd'),
                            },
                        )
                    }
                })
            })

            const recentMemoryUsages: object[] = []
            dynatraceApi.getRecentMemoryUsage(selectedDynatraceEntityId).then(recentMemoryUsageFromDynatrace => {
                recentMemoryUsageFromDynatrace?.values.forEach((value, index) => {
                    if (!!value) {
                        recentMemoryUsages.push(
                            {
                                memoryUsage: value.toFixed(2),
                                timestamp: dayjs(recentMemoryUsageFromDynatrace.timestamps[index]).format('ddd'),
                            },
                        )
                    }
                })
            })

            setRecentCpuUsage(recentCpuUsages)
            setRecentMemoryUsage(recentMemoryUsages)
        }
    }, [dynatraceApi, selectedDynatraceEntityId])

    const {loading, error} = useAsync(async () => {
        const cpuRequest = await dynatraceApi.getCpuRequest(entityName)
        const memoryRequest = await dynatraceApi.getMemoryRequest(entityName)
        const lastWeekCpuUsage = await dynatraceApi.getCpuUsageForLastWeek(entityName)
        const lastWeekMemoryUsage = await dynatraceApi.getMemoryUsageForLastWeek(entityName)

        const dataRows: DataRow[] = []
        dynatraceEntities?.forEach(dynatraceEntity => {
            const cpuRequests: number = cpuRequest?.[0].data.find(data => (data.dimensions.includes(dynatraceEntity.entityId)))?.values[0] || 0
            const cpuUtilization: number = lastWeekCpuUsage?.[0].data.find(data => (data.dimensions.includes(dynatraceEntity.entityId)))?.values[0] || 0
            const memoryRequests: number = memoryRequest?.[0].data.find(data => (data.dimensions.includes(dynatraceEntity.entityId)))?.values[0] || 0
            const memoryUtilization: number = lastWeekMemoryUsage?.[0].data.find(data => (data.dimensions.includes(dynatraceEntity.entityId)))?.values[0] || 0

            dataRows.push(
                createData(
                    dynatraceEntity.displayName,
                    dynatraceEntity.entityId,
                    dynatraceEntity.managementZones[0].name,
                    cpuRequests,
                    cpuUtilization,
                    memoryRequests,
                    memoryUtilization,
                ),
            )
        })

        setRows(dataRows)
    }, [dynatraceApi])

    return (
        <InfoCard
            title="Utilization Metrics"
            subheader="Daily average CPU and Memory Utilization for the past week"
        >
            <TableContainer component={Paper}>
                <Table aria-label="collapsible table" className={classes.root}>
                    <TableHead>
                        <TableRow>
                            <TableCell/>
                            <TableCell>MANAGEMENT ZONE</TableCell>
                            <TableCell align="right">CPU REQUEST</TableCell>
                            <TableCell align="right">CPU UTILIZATION</TableCell>
                            <TableCell align="right">MEMORY REQUEST</TableCell>
                            <TableCell align="right">MEMORY UTILIZATION</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, index) => (
                            <React.Fragment key={row.name + index}>
                                <TableRow className={classes.root}>
                                    <TableCell>
                                        <IconButton
                                            aria-label="expand row"
                                            size="small"
                                            onClick={() => {
                                                if (selectedDynatraceEntityId === row.dynatraceEntityId) {
                                                    setSelectedDynatraceEntityId(undefined)
                                                } else {
                                                    setSelectedDynatraceEntityId(row.dynatraceEntityId)
                                                }
                                            }}
                                        >
                                            {selectedDynatraceEntityId === row.dynatraceEntityId ?
                                                <KeyboardArrowUpIcon/> : <KeyboardArrowDownIcon/>}
                                        </IconButton>
                                    </TableCell>
                                    <TableCell component="th" scope="row">{row.managementZone}</TableCell>
                                    <TableCell align="right">{row.cpuRequests} mCores</TableCell>
                                    <TableCell align="right">
                                        <div
                                            className={classNames({'below-threshold': row.cpuUtilization < CPU_UTILIZATION_THRESHOLD})}>
                                            {row.cpuUtilization < CPU_UTILIZATION_THRESHOLD &&
                                                <Warning/>
                                            }
                                            {row.cpuUtilization.toFixed(2)}%
                                        </div>
                                    </TableCell>
                                    <TableCell align="right">{row.memoryRequests} MiB</TableCell>
                                    <TableCell align="right">
                                        <div
                                            className={classNames({'below-threshold': row.memoryUtilization < MEMORY_UTILIZATION_THRESHOLD})}>
                                            {row.memoryUtilization < MEMORY_UTILIZATION_THRESHOLD && <Warning/>}
                                            {row.memoryUtilization.toFixed(2)}%
                                        </div>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell style={{paddingBottom: 0, paddingTop: 0}} colSpan={6}>
                                        <Collapse in={selectedDynatraceEntityId === row.dynatraceEntityId}>
                                            {loading && <Progress/>}
                                            {error && <ResponseErrorPanel error={error}/>}
                                            {!loading && !error &&
                                                <Grid className={classes.graphs} container spacing={2}>
                                                    <Grid item md={12} lg={6}>
                                                        <h3>Requested CPU Utilization</h3>
                                                        <LineChart
                                                            width={500}
                                                            height={300}
                                                            data={recentCpuUsage}
                                                            margin={{
                                                                top: 20,
                                                                right: 50,
                                                                left: 20,
                                                                bottom: 5,
                                                            }}
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3"
                                                                           stroke="#b5b5b5"/>
                                                            <Tooltip/>
                                                            <XAxis dataKey="timestamp" stroke="#fff"/>
                                                            <YAxis type="number" unit="%" stroke="#fff"
                                                                   domain={[0, () => ('100')]}/>
                                                            <ReferenceLine y={CPU_UTILIZATION_THRESHOLD}
                                                                           stroke="red"/>
                                                            <Line type="monotone" dataKey="cpuUsage"
                                                                  stroke="#8884d8"/>
                                                        </LineChart>
                                                        {row.cpuUtilization < CPU_UTILIZATION_THRESHOLD &&
                                                            <Alert severity="warning">
                                                                <AlertTitle>CPU Utilization Low</AlertTitle>
                                                                Please reduce the request setting to
                                                                calc(current usage + 20%)
                                                            </Alert>
                                                        }
                                                    </Grid>
                                                    <Grid item md={12} lg={6}>
                                                        <h3>Requested Memory Utilization</h3>
                                                        <LineChart
                                                            width={500}
                                                            height={300}
                                                            data={recentMemoryUsage}
                                                            margin={{
                                                                top: 20,
                                                                right: 50,
                                                                left: 20,
                                                                bottom: 5,
                                                            }}
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3"
                                                                           stroke="#b5b5b5"/>
                                                            <Tooltip/>
                                                            <XAxis dataKey="timestamp" stroke="#fff"/>
                                                            <YAxis type="number" unit="%" stroke="#fff"
                                                                   domain={[0, () => ('100')]}/>
                                                            <ReferenceLine y={MEMORY_UTILIZATION_THRESHOLD}
                                                                           stroke="red"/>
                                                            <Line type="monotone" dataKey="memoryUsage"
                                                                  stroke="#8884d8"/>
                                                        </LineChart>
                                                        {row.memoryUtilization < MEMORY_UTILIZATION_THRESHOLD &&
                                                            <Alert severity="warning">
                                                                <AlertTitle>Memory Utilization Low</AlertTitle>
                                                                Please reduce the request setting to
                                                                calc(current usage + 20%)
                                                            </Alert>
                                                        }
                                                    </Grid>
                                                </Grid>
                                            }
                                        </Collapse>
                                    </TableCell>
                                </TableRow>
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </InfoCard>
    )
}
