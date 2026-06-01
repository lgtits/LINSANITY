import mockData from '../mock/tuition.json'

let data = {
  rates: JSON.parse(JSON.stringify(mockData.rates || {})),
  settings: JSON.parse(JSON.stringify(mockData.settings)),
  attendance: JSON.parse(JSON.stringify(mockData.attendance))
}

export const tuitionService = {
  async getAll() {
    return {
      rates: JSON.parse(JSON.stringify(data.rates)),
      settings: JSON.parse(JSON.stringify(data.settings)),
      attendance: JSON.parse(JSON.stringify(data.attendance))
    }
  },

  async updateSetting(studentId, key, value) {
    if (!data.settings[studentId]) {
      data.settings[studentId] = { classType: 'full', withMeal: false }
    }
    data.settings[studentId][key] = value
  },

  async updateAttendance(studentId, monthKey, key, value) {
    if (!data.attendance[studentId]) data.attendance[studentId] = {}
    if (!data.attendance[studentId][monthKey]) {
      data.attendance[studentId][monthKey] = { totalDays: 22, absentDays: 0 }
    }
    data.attendance[studentId][monthKey][key] = value
  },

  async updateRates(monthKey, ratesValue) {
    data.rates[monthKey] = { ...ratesValue }
  }
}
