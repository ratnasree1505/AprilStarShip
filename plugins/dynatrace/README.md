# dynatrace

Welcome to the dynatrace plugin!

_This plugin was created through the Backstage CLI_

## Getting started

Your plugin has been added to the example app in this repository, meaning you'll be able to access it by running `yarn start` in the root directory, and then navigating to [/dynatrace](http://localhost:3000/dynatrace).

You can also serve the plugin in isolation by running `yarn start` in the plugin directory.
This method of serving the plugin provides quicker iteration speed and a faster startup and hot reloads.
It is only meant for local development, and the setup for it can be found inside the [/dev](./dev) directory.


# Remaining Development Work as of January 20, 2023

## Assumptions

1. Management Zones can be constructed by calling CloudUtils lookupUser using the SID (Okta) or Email (GitHub) returned by the Auth provider. This will return the namespaces and clusters a logged on user can access:

```
{
  "userid": "eksikpe",
  "email": "Ralf.Offermann@McKesson.com",
  "first_name": "Ralf",
  "last_name": "Offermann",
  "distinguished_name": "CN=eksikpe,OU=employees,DC=na,DC=corp,DC=mckesson,DC=com",
  "k8s": [
    {
      "cluster": "aks-us-west-dev",
      "namespace": "ro-test-dev",
      "sid": "sksikpe",
      "email": "Ralf.Offermann@McKesson.com"
    },
    {
      "cluster": "aks-us-west-dev",
      "namespace": "ro-vmware-dev",
      "sid": "sksikpe",
      "email": "Ralf.Offermann@McKesson.com"
    }
  ]
}
```

This output indicates that the management zones Ralf has access to is: ```aks-us-west-dev-ro-vmware-dev```.

2. The metadata.name in the catalog-info.yaml is the same name as the kubernetes workload name in Dynatrace. The kubernetes workload created will have -dev and -prod appended on the end. The Dynatrace Plugin uses the metadata.name from the catalog-info.yaml to query Dynatrace for problems and utlization metrics.

3. The Dynatrace plugin will only return data for a single Backstage Catalog entity.

## Remaining Work

* Implement logic to handle appending -dev and -prod onto the entity name. 
* The Github Auth provider is not returning email adddress which is needed to call CloudUtlls Userlookup to return the cluster and namespace information to construct Management Zones.
* The Metrics Queries right now take 10+ plus seconds. We need to fine tune these queries to reduce the amount of time: getCpuUsageForLastWeek and getMemoryUsageForLastWeek. Here are examples:

```
getCpuUsageForLastWeek

http://localhost:7007/api/proxy/dynatrace/metrics/query?metricSelector=((builtin:containers.cpu.usageMilliCores:avg:parents:parents:splitBy("dt.entity.cloud_application"):sum/builtin:kubernetes.workload.requests_cpu:avg:splitBy("dt.entity.cloud_application"):sum*100):splitBy("dt.entity.cloud_application"):avg):names:setUnit(Percent):parents:parents:filter(in("dt.entity.cloud_application",entitySelector("type(CLOUD_APPLICATION),entityName.equals(vj-dt-test-dev)")))&resolution=Inf&from=now-1w

((builtin:containers.cpu.usageMilliCores:avg:parents:parents:splitBy("dt.entity.cloud_application"):sum/builtin:kubernetes.workload.requests_cpu:avg:splitBy("dt.entity.cloud_application"):sum*100):splitBy("dt.entity.cloud_application"):avg):names:setUnit(Percent):parents:parents:filter(in("dt.entity.cloud_application",entitySelector("type(CLOUD_APPLICATION),entityName.equals(vj-dt-test-dev)")))
```

```
getMemoryUsageForLastWeek

http://localhost:7007/api/proxy/dynatrace/metrics/query?metricSelector=%28%28builtin%3Acontainers.memory.residentSetBytes%3Aavg%3Aparents%3Aparents%3AsplitBy%28%22dt.entity.cloud_application%22%29%2Fbuiltin%3Akubernetes.workload.requests_memory%3Aavg%3AsplitBy%28%22dt.entity.cloud_application%22%29*100%29%3AsplitBy%28%22dt.entity.cloud_application%22%29%3Aavg%29%3Anames%3AsetUnit%28Percent%29%3Aparents%3Aparents%3Afilter%28in%28%22dt.entity.cloud_application%22%2CentitySelector%28%22type%28CLOUD_APPLICATION%29%2CentityName.equals%28vj-dt-test-dev%29%22%29%29%29&resolution=Inf&from=now-1w

((builtin:containers.memory.residentSetBytes:avg:parents:parents:splitBy("dt.entity.cloud_application")/builtin:kubernetes.workload.requests_memory:avg:splitBy("dt.entity.cloud_application")*100):splitBy("dt.entity.cloud_application"):avg):names:setUnit(Percent):parents:pare
```

4. The way we construct the Management Zone Name isn't consistent. It doesn't appear that the CloudUtils Userlookup always returns all the namespaces a user has access to. Sometimes it is cluster name + namespace. Othertimes it is just the cluster name. Sometimes it doesn't return all the clusters. Do we really need to filter by Management Zone since we are only returning Dynatrace information for a single entity and not across the namespace.

If the management zone cannot be consistently determined by the CloudUtils service then the Dynatrace Plugin will not not work for the majority of registered Backstage Catalogs. 

5. Finish Testing. 

* Can't view Dynatrace Information for Entities based on your Management Zone.
* The Utilization information is correctly returned from Dynatrace.
* The Problems are returned correctly from Dynatrace.
* Login with both Auth Providers works with Dynatrace Plugin.
* Test with Entity that is in both prod and dev. 

6. Put in Entity Name into the Utilization on the Dynatrace Tab since there will be a -dev and -prod entity name to look up instead basing it on the management zone.

7. Plugin Optimization (Where can we do concurrent calls, better error handling, etc.)

8. Update the Warning Messages when to reduce utilization. 