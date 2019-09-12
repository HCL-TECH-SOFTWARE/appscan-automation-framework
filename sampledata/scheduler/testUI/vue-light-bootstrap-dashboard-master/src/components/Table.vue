<template>
  <table class="table">
    <thead>
      <slot name="columns">
        <tr>
          <th v-for="column in columns" :key="column">{{column}}</th>
        </tr>
      </slot>
    </thead>
    <tbody>
      <tr v-for="(item, index) in data" :key="index">
        <slot :row="item">
          <td
            v-for="column in columns"
            :key="column"
            v-if="hasValue(item, column)"
          >{{itemValue(item, column)}}</td>
          <span>
            <button class="nc-icon nc-simple-remove" @click="deleteScan(item)"></button>
          </span>
        </slot>
      </tr>
    </tbody>
  </table>
</template>
<script>
import schedulerJSON from "../../../../scheduleSample.json";
import config from "../../../../../../config/config";
import { saveAs } from 'file-saver';


export default {
  name: "l-table",
  props: {
    columns: Array,
    data: Array
  },
  methods: {
    hasValue(item, column) {
      return item[column.toLowerCase()] !== "undefined";
    },
    itemValue(item, column) {
      return item[column.toLowerCase()];
    },
    deleteScan(scan) {
      console.log("DELETE scan clicked! data: " + JSON.stringify(scan));
      removeScan(scan);
    }
  }
};

function removeScan(scan) {
  let newScanArray = [];
  console.log("removeScan!");
  for (let t in schedulerJSON.scans) {
    console.log("SCAN: " + JSON.stringify(schedulerJSON.scans[t]));
    if (schedulerJSON.scans[t].scanId === scan.scanid) {
      console.log("Found scan, delete...");
       schedulerJSON.scans[t];
    } else {
      newScanArray.push(schedulerJSON.scans[t]);
    }
  }

  writeFile(config.Location_of_schedule_json, newScanArray, () => {
    console.log("Complete.....");
  });
}

var writeFile = function(filename, data, callback) {
  let scans = {
    scans: data
  }
  // convert JSOn to blob
  let blob = new Blob([JSON.stringify(scans, null, 2)], { type: 'application/json' })
  saveAs(blob, filename);
  // fs.writeFile(filename, data, function(err) {
  //   if (err) {
  //     return logger.error("Error trying to write file.  Error: " + err);
  //   }
  //   logger.debug("The file was saved!");
    callback();
  // });
};
</script>
<style>
</style>
