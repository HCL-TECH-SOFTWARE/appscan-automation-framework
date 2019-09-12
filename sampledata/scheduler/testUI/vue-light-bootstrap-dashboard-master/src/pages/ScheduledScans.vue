<template>
  <div class="content">
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <card class="strpied-tabled-with-hover" body-classes="table-full-width table-responsive">
            <template slot="header">
              <h4 class="card-title">Scheduled Scans</h4>
              <p class="card-category">Here are the scheduled scans</p>
            </template>
            <l-table
              class="table-hover table-striped"
              :columns="table1.columns"
              :data="table1.data"
              :button="'<b-button>Button</b-button>'"
            ></l-table>
          </card>
        </div>


        <div class="col-12">
          <card class="strpied-tabled-with-hover" body-classes="table-full-width table-responsive">
            <template slot="header">
              <h4 class="card-title">Small table</h4>
              <p class="card-category">Here is a subtitle for this table</p>
            </template>
            <l-table
              class="table-hover table-striped table-sm"
              :columns="table1.columns"
              :data="table1.data"
            ></l-table>
          </card>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import LTable from "src/components/Table.vue";
import Card from "src/components/Cards/Card.vue";
import schedulerJSON from "../../../../scheduleSample.json";

const tableColumns = ["scanid", "start scan", "end scan"];
const tableData = [];
export default {
  components: {
    LTable,
    Card
  },
  data() {
    return {
      table1: {
        columns: [...tableColumns],
        data: [...tableData],
        button: {
          html: true
        }
      },
      table2: {
        columns: [...tableColumns],
        data: [...tableData]
      }
    };
  }
};

function readJSON() {
  for (let t in schedulerJSON.scans) {
    console.log("SCAN: " + JSON.stringify(schedulerJSON.scans[t]));
    let scanEntry = {
      scanid: schedulerJSON.scans[t].scanID,
      "start scan": schedulerJSON.scans[t].start_scan_window,
      "end scan": schedulerJSON.scans[t].end_scan_window
    };
    tableData.push(scanEntry);
  }
}
readJSON();
</script>
<style>
</style>
