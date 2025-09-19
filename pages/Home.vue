<template>
    <!-- Состояние загрузки данных -->
    <v-card v-if="loadingData" class="text-center pa-4">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
      <div class="mt-2">Загрузка данных...</div>
    </v-card>

    <!-- Состояние неверной сущности -->
    <v-card v-else-if="!isValidEntity" class="text-center pa-4">
      <v-icon color="error" size="64" class="mb-2">mdi-alert-circle-outline</v-icon>
      <div class="text-h6 mb-2">Недоступно</div>
      <div class="text-body-1 text-medium-emphasis">
        Данное приложение доступно только при вызове из мероприятия или сделки
      </div>
    </v-card>

    <!-- Вкладки -->
    <v-tabs v-else v-model="activeTab" grow>
      <v-tab value="send">Отправка сообщений</v-tab>
      <v-tab value="contacts">Контакты мероприятия</v-tab>
    </v-tabs>

    <!-- Содержимое вкладок -->
    <v-window v-model="activeTab" class="mt-4">
      <!-- Вкладка отправки сообщений -->
      <v-window-item value="send">
        <v-form @submit.prevent="submitForm" ref="form">
          <v-card>
            <v-card-text>
              <!-- Сообщение -->
              <v-textarea
                v-model="formData.input"
                label="Сообщение"
                :rules="requiredRules"
                required
                rows="3"
                variant="outlined"
              ></v-textarea>

              <!-- Загрузка файлов -->
              <v-file-input
                v-model="formData.files"
                label="Прикрепить файлы"
                multiple
                chips
                counter
                show-size
                prepend-icon="mdi-paperclip"
                :rules="fileRules"
                variant="outlined"
              ></v-file-input>
            </v-card-text>
            
            <v-card-actions>
              <v-btn 
                type="submit" 
                color="primary" 
                :loading="loading"
                :disabled="loading || !isFormValid"
              >
                Отправить
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-form>
      </v-window-item>

      <!-- Вкладка контактов -->
      <v-window-item value="contacts">
        <v-card>
          <v-card-text>
            <!-- Прогресс загрузки -->
            <div v-if="loadingContacts" class="text-center py-4">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
              <div class="mt-2">Загрузка контактов...</div>
            </div>

            <!-- Сообщение об ошибке -->
            <v-alert v-else-if="errorMessage" type="error" class="mb-4">
              {{ errorMessage }}
            </v-alert>

            <!-- Контакты сгруппированные по ЦА -->
            <div v-else-if="groupedContacts.length > 0">
              <v-expansion-panels>
                <v-expansion-panel 
                  v-for="(group, index) in groupedContacts" 
                  :key="index"
                >
                  <v-expansion-panel-title>
                    <v-row align="center">
                      <v-col cols="8">
                        <strong>{{ group.targetAudienceName }}</strong>
                        <div class="text-caption text-medium-emphasis">
                          Контактов: {{ group.contacts.length }}
                        </div>
                      </v-col>
                      <v-col cols="4" class="text-right">
                        <v-chip size="small" color="primary">
                          {{ group.deals.length }} сделок
                        </v-chip>
                      </v-col>
                    </v-row>
                  </v-expansion-panel-title>
                  
                  <v-expansion-panel-text>

                    <!-- Замена: v-card вместо v-expansion-panels для компаний -->
                    <div v-if="group.companies && group.companies.length > 0" class="companies-container">
                      <v-card 
                        v-for="(company, companyIndex) in group.companies" 
                        :key="companyIndex"
                        class="mb-4"
                        variant="outlined"
                      >
                        <v-card-title class="d-flex align-center">
                          <v-icon class="mr-2">mdi-office-building</v-icon>
                          <strong>
                            <a 
                              :href="`https://ittochka.bitrix24.ru/crm/company/details/${company.id}/`"
                              class="link"
                              target="_blank"
                            >
                              {{ company.name || 'Без компании' }}
                            </a>
                          </strong>
                          <v-spacer></v-spacer>
                          <v-chip size="small" color="secondary">
                            {{ company.contacts.length }} конт.
                          </v-chip>
                        </v-card-title>
                        
                        <v-card-text>
                          <!-- Таблица контактов компании -->
                          <v-table density="compact">
                            <thead>
                              <tr>
                                <th>ФИО</th>
                                <th>Должность</th>
                                <th>Email</th>
                                <th>Местоположение</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="contact in company.contacts" :key="contact.ID">
                                <td>
                                  <a 
                                    :href="`https://ittochka.bitrix24.ru/crm/contact/details/${contact.ID}/`"
                                    class="link"
                                    target="_blank"
                                  >
                                    {{ contact.LAST_NAME }} 
                                    {{ contact.NAME }} 
                                    {{ contact.SECOND_NAME }}
                                  </a>
                                </td>
                                <td>
                                  <span v-if="contact.POST">
                                    {{ contact.POST }}
                                  </span>
                                  <span v-else class="text-medium-emphasis">Не указана</span>
                                </td>
                                <td>
                                  <span v-if="contact.EMAIL && contact.EMAIL.length > 0">
                                    {{ contact.EMAIL[0].VALUE }}
                                  </span>
                                  <span v-else class="text-error">Нет email</span>
                                </td>
                                <td>
                                  <span v-if="getFormattedLocation(contact)" style="white-space: pre-line;">
                                    {{ getFormattedLocation(contact) }}
                                  </span>
                                  <span v-else class="text-medium-emphasis">Не указано</span>
                                </td>
                              </tr>
                            </tbody>
                          </v-table>
                        </v-card-text>
                      </v-card>
                    </div>

                    <!-- Контакты без компании -->
                    <div v-if="group.contactsWithoutCompany && group.contactsWithoutCompany.length > 0">
                      <v-divider class="my-4"></v-divider>
                      <h4 class="mb-3">Контакты без компании</h4>
                      <v-table density="compact">
                        <thead>
                          <tr>
                            <th>Имя</th>
                            <th>Email</th>
                            <th>Должность</th>
                            <th>Местоположение</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="contact in group.contactsWithoutCompany" :key="contact.ID">
                            <td>
                              {{ contact.NAME }} 
                              {{ contact.LAST_NAME }} 
                              {{ contact.SECOND_NAME }}
                            </td>
                            <td>
                              <span v-if="contact.EMAIL && contact.EMAIL.length > 0">
                                {{ contact.EMAIL[0].VALUE }}
                              </span>
                              <span v-else class="text-error">Нет email</span>
                            </td>
                            <td>
                              <span v-if="contact.POST">
                                {{ contact.POST }}
                              </span>
                              <span v-else class="text-medium-emphasis">Не указана</span>
                            </td>
                            <td>
                              <span v-if="getFormattedLocation(contact)">
                                {{ getFormattedLocation(contact) }}
                              </span>
                              <span v-else class="text-medium-emphasis">Не указано</span>
                            </td>
                          </tr>
                        </tbody>
                      </v-table>
                    </div>

                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>

              <!-- Итоговая статистика -->
              <v-alert type="info" class="mt-4">
                Всего: {{ totalContacts }} контактов в {{ totalDeals }} сделках | 
                Компаний: {{ totalCompanies }} | 
                Контактов без компании: {{ totalContactsWithoutCompany }}
              </v-alert>
            </div>

            <!-- Нет контактов -->
            <v-alert v-else type="warning">
              Контакты не найдены или мероприятие не содержит сделок
            </v-alert>
          </v-card-text>
        </v-card>
      </v-window-item>
    </v-window>

    <!-- Уведомление -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color">
      {{ snackbar.message }}
    </v-snackbar>
</template>

<script>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { callApi } from '../functions/callApi'

export default {
  setup() {
    // Реактивные переменные
    const loadingData = ref(true)
    const loading = ref(false)
    const loadingContacts = ref(false)
    const isValidEntity = ref(false)
    const activeTab = ref('send')
    const form = ref(null)
    const errorMessage = ref('')
    
    const entityInfo = reactive({
      ENTITY_VALUE_ID: null,
      ENTITY_ID: null
    })
    
    const formData = reactive({
      input: '',
      files: []
    })
    
    const snackbar = reactive({
      show: false,
      message: '',
      color: 'success'
    })

    const groupedContacts = ref([])
    
    const requiredRules = [
      v => !!v || 'Обязательное поле',
      v => (v && v.trim().length > 0) || 'Поле не может быть пустым'
    ]
    
    const fileRules = [
      v => !v || v.length === 0 || v.some(file => file) || 'Загрузите хотя бы один файл'
    ]

    // Вычисляемые свойства
    const isFormValid = computed(() => {
      return formData.input.trim().length > 0 && formData.files.length > 0
    })

    const totalContacts = computed(() => {
      return groupedContacts.value.reduce((total, group) => total + group.contacts.length, 0)
    })

    const totalDeals = computed(() => {
      return groupedContacts.value.reduce((total, group) => total + group.deals.length, 0)
    })

    const totalCompanies = computed(() => {
      return groupedContacts.value.reduce((total, group) => {
        return total + (group.companies ? group.companies.length : 0)
      }, 0)
    })

    const totalContactsWithoutCompany = computed(() => {
      return groupedContacts.value.reduce((total, group) => {
        return total + (group.contactsWithoutCompany ? group.contactsWithoutCompany.length : 0)
      }, 0)
    })

    // Методы
const callBatch = async (commands, maxBatchSize = 50) => {
  try {
    const results = []
    const batches = []
    
    // Разбиваем команды на батчи по maxBatchSize
    for (let i = 0; i < commands.length; i += maxBatchSize) {
      batches.push(commands.slice(i, i + maxBatchSize))
    }
    
    // Выполняем каждый батч
    for (const batch of batches) {
      const batchCmd = {}
      batch.forEach((cmd, index) => {
        batchCmd[`cmd${index}`] = cmd
      })
      
      const batchResult = await new Promise((resolve) => {
        BX24.callBatch(batchCmd, (result) => {
          const batchResults = []
          
          for (let i = 0; i < batch.length; i++) {
            const key = `cmd${i}`
            if (result[key] && !result[key].error()) {
              batchResults.push(result[key].data())
            } else {
              // Игнорируем ошибки, но логируем их
              const error = result[key]?.error()
              if (error) {
                const errorMessage = error.exerror || error.error || 'Unknown error'
                
                // Игнорируем ошибки "не найдено"
                if (errorMessage.includes('Not found') || 
                    errorMessage.includes('не найдена') ||
                    errorMessage.includes('not found')) {
                  console.log(`Запись не найдена, игнорируем: ${key}`)
                } else {
                  console.warn(`Ошибка в batch-запросе ${key}:`, errorMessage)
                }
              }
              batchResults.push(null)
            }
          }
          
          resolve(batchResults)
        })
      })
      
      results.push(...batchResult)
    }
    
    return results
  } catch (error) {
    console.error('Критическая ошибка выполнения batch:', error)
    // В случае общей ошибки возвращаем null для всех запросов
    return commands.map(() => null)
  }
}

    // Оптимизированный метод получения сделок мероприятия
    const getEventDeals = async (eventId) => {
      try {
        // Получаем поле ufCrm_AddedDeals мероприятия с использованием batch
        const eventData = (await callApi(
          "crm.item.list", 
          { id: eventId},
          ["ufCrm38_AddedDeals"],
          1052 
        ))[0];
        
        const addedDeals = eventData.ufCrm38_AddedDeals.split(" / ");
        
        if (!addedDeals || addedDeals.length === 0) {
          return []
        }

        const dealsMap = new Map()
        
        addedDeals.forEach(item => {
          const [targetAudiencePart, dealsPart] = item.split(' - ')
          if (targetAudiencePart && dealsPart) {
            const targetAudienceIds = targetAudiencePart.split(',').map(id => parseInt(id.trim()))
            const dealIds = dealsPart.split(',').map(id => parseInt(id.trim()))
            
            targetAudienceIds.forEach(taId => {
              if (!dealsMap.has(taId)) {
                dealsMap.set(taId, [])
              }
              dealsMap.get(taId).push(...dealIds)
            })
          }
        })

        return dealsMap
      } catch (error) {
        console.error('Ошибка получения сделок мероприятия:', error)
        throw error
      }
    }

    // Оптимизированный метод получения названий целевых аудиторий
    const getTargetAudienceNames = async (targetAudienceIds) => {
      try {
        const uniqueIds = [...new Set(targetAudienceIds)]
        const commands = uniqueIds.map(id => ({
          method: 'lists.element.get',
          params: {
            'IBLOCK_TYPE_ID': 'lists',
            'IBLOCK_ID': '216',
            'filter': { 'ID': id }
          }
        }))
        
        const results = await callBatch(commands)
        
        const nameMap = new Map()
        results.forEach((result, index) => {
          const id = uniqueIds[index]
          if (result && result.length > 0) {
            nameMap.set(id, result[0].NAME || `ЦА #${id}`)
          } else {
            nameMap.set(id, `ЦА #${id}`)
          }
        })
        
        return nameMap
      } catch (error) {
        console.error('Ошибка получения названий ЦА:', error)
        // Возвращаем мапу с дефолтными значениями
        const defaultMap = new Map()
        targetAudienceIds.forEach(id => {
          defaultMap.set(id, `ЦА #${id}`)
        })
        return defaultMap
      }
    }

    // Оптимизированный метод получения информации о сделках
    const getDealsInfo = async (dealIds) => {
      try {
        const uniqueDealIds = [...new Set(dealIds)]
        const commands = uniqueDealIds.map(dealId => ({
          method: 'crm.deal.get',
          params: { id: dealId }
        }))
        
        const results = await callBatch(commands)
        
        const dealInfoMap = new Map()
        results.forEach((dealInfo, index) => {
          const dealId = uniqueDealIds[index]
          dealInfoMap.set(dealId, dealInfo || {})
        })
        
        return dealInfoMap
      } catch (error) {
        console.error('Ошибка получения информации о сделках:', error)
        throw error
      }
    }

    // Оптимизированный метод получения контактов сделок
    const getDealsContacts = async (dealIds) => {
      try {
        const commands = dealIds.map(dealId => ({
          method: 'crm.deal.contact.items.get',
          params: { id: dealId }
        }))
        
        const results = await callBatch(commands)
        
        const contactsMap = new Map()
        results.forEach((contactItems, index) => {
          const dealId = dealIds[index]
          const contactIds = contactItems ? contactItems.map(item => item.CONTACT_ID) : []
          contactsMap.set(dealId, contactIds)
        })
        
        return contactsMap
      } catch (error) {
        console.error('Ошибка получения контактов сделок:', error)
        throw error
      }
    }
const getFormattedLocation = (contact) => {
  const parts = [];
  if (contact.DISTRICT_TITLE && contact.DISTRICT_TITLE.length > 0) {
    parts.push(`Федеральный округ - ${contact.DISTRICT_TITLE}`);
  }
  
  if (contact.REGION_TITLE && contact.REGION_TITLE.length > 0) {
    parts.push(`Регион - ${contact.REGION_TITLE}`);
  }
  
  if (contact.CITY_TITLE && contact.CITY_TITLE.length > 0) {
    parts.push(`Город - ${contact.CITY_TITLE}`);
  }
  
  return parts.length > 0 ? parts.map(part => part + ' /').join('\n') : null;
}
    // Оптимизированный метод получения детальной информации о контактах
   const getContactsDetails = async (contactIds) => {
  try {
    const uniqueContactIds = [...new Set(contactIds)];
    
    // Получаем данные о локациях
    const { citiesMap, regionsMap, districtsMap } = await getLocationData();
    
    // Получаем базовую информацию о контактах
    const contactCommands = uniqueContactIds.map(contactId => ({
      method: 'crm.contact.get',
      params: { id: contactId }
    }));
    
    const contactResults = await callBatch(contactCommands);
    
    // Собираем ID компаний для дополнительных запросов
    const companyIds = [];
    const contactDetailsMap = new Map();
    
    contactResults.forEach((contact, index) => {
      const contactId = uniqueContactIds[index];
      if (contact && contact.ID) {
        // Заменяем ID на названия для локаций
        
        if (contact.UF_CRM_1753083765) { // ID города
          contact.CITY_TITLE = citiesMap.get(parseInt(contact.UF_CRM_1753083765)) || contact.UF_CRM_1753083765;
        }
        if (contact.UF_CRM_1756304636) { // ID региона
          contact.REGION_TITLE = regionsMap.get(parseInt(contact.UF_CRM_1756304636)) || contact.UF_CRM_1756304636;
        }
        if (contact.UF_CRM_1756304661) { // ID федерального округа
          contact.DISTRICT_TITLE = districtsMap.get(parseInt(contact.UF_CRM_1756304661)) || contact.UF_CRM_1756304661;
        }
        
        contactDetailsMap.set(contactId, contact);
        if (contact.COMPANY_ID) {
          companyIds.push(contact.COMPANY_ID);
        }
      }
    });
    
    // ... остальная часть метода без изменений
    // Получаем информацию о компаниях
    if (companyIds.length > 0) {
      const uniqueCompanyIds = [...new Set(companyIds)];
      const companyCommands = uniqueCompanyIds.map(companyId => ({
        method: 'crm.company.get',
        params: { id: companyId }
      }));
      
      const companyResults = await callBatch(companyCommands);
      
      const companyMap = new Map();
      companyResults.forEach((company, index) => {
        const companyId = uniqueCompanyIds[index];
        if (company && company.ID) {
          companyMap.set(companyId, company);
        }
      });
      
      // Обновляем контакты с названиями компаний
      contactDetailsMap.forEach((contact, contactId) => {
        if (contact.COMPANY_ID && companyMap.has(contact.COMPANY_ID)) {
          contact.COMPANY_TITLE = companyMap.get(contact.COMPANY_ID).TITLE;
        }
      });
    }
    
    return contactDetailsMap;
  } catch (error) {
    console.error('Ошибка получения детальной информации о контактах:', error);
    throw error;
  }
}
    // Переписанный метод loadContacts с использованием batch
    const loadContacts = async () => {
      if (!isValidEntity.value) return

      loadingContacts.value = true
      errorMessage.value = ''
      groupedContacts.value = []

      try {
        let eventId

        if (entityInfo.ENTITY_ID === 'CRM_DYNAMIC_1052_DETAIL_TAB') {
          eventId = entityInfo.ENTITY_VALUE_ID
        } else if (entityInfo.ENTITY_ID === 'CRM_DEAL_DETAIL_TAB') {
          const dealInfo = await new Promise((resolve) => {
            BX24.callMethod(
              "crm.deal.get",
              { id: entityInfo.ENTITY_VALUE_ID },
              function(result) {
                if (result.error()) {
                  console.error(result.error())
                  resolve({})
                } else {
                  resolve(result.data())
                }
              }
            )
          })
          eventId = dealInfo.UF_CRM_1742797326
        }

        if (!eventId) {
          errorMessage.value = 'Не удалось определить мероприятие'
          return
        }

        // Получаем сделки мероприятия
        const dealsMap = await getEventDeals(eventId)

        if (dealsMap.size === 0) {
          errorMessage.value = 'Мероприятие не содержит сделок'
          return
        }

        // Собираем все ID для batch-запросов
        const allTargetAudienceIds = Array.from(dealsMap.keys())
        const allDealIds = Array.from(dealsMap.values()).flat()
        
        // Получаем названия целевых аудиторий
        const targetAudienceNameMap = await getTargetAudienceNames(allTargetAudienceIds)
        
        // Получаем информацию о всех сделках
        const dealsInfoMap = await getDealsInfo(allDealIds)
        
        // Получаем контакты всех сделок
        const dealsContactsMap = await getDealsContacts(allDealIds)
        
        // Собираем все ID контактов
        const allContactIds = Array.from(dealsContactsMap.values()).flat()
        
        // Получаем детальную информацию о всех контактах
        const contactsDetailsMap = await getContactsDetails(allContactIds)

        // Группируем контакты по целевым аудиториям
        const groupedData = []

        for (const [targetAudienceId, dealIds] of dealsMap.entries()) {
          const targetAudienceName = targetAudienceNameMap.get(targetAudienceId)
          
          const group = {
            targetAudienceId,
            targetAudienceName,
            deals: [],
            contacts: []
          }

          // Обрабатываем сделки для текущей ЦА
          for (const dealId of dealIds) {
            const dealInfo = dealsInfoMap.get(dealId)
            if (dealInfo && dealInfo.ID) {
              group.deals.push(dealInfo)

              // Добавляем контакты сделки
              const contactIds = dealsContactsMap.get(dealId) || []
              contactIds.forEach(contactId => {
                const contactDetails = contactsDetailsMap.get(contactId)
                if (contactDetails && !group.contacts.some(c => c.ID === contactId)) {
                  group.contacts.push(contactDetails)
                }
              })
            }
          }

          // Группируем контакты по компаниям
          const { companies, contactsWithoutCompany } = groupContactsByCompanies(group.contacts)
          group.companies = companies
          group.contactsWithoutCompany = contactsWithoutCompany

          groupedData.push(group)
        }

        groupedContacts.value = groupedData

      } catch (error) {
        console.error('Ошибка загрузки контактов:', error)
        errorMessage.value = 'Ошибка загрузки контактов: ' + error.message
      } finally {
        loadingContacts.value = false
      }
    }

    const checkEntityValidity = async () => {
      try {
        entityInfo.ENTITY_VALUE_ID = BX24.placement.info().options.ID;
        entityInfo.ENTITY_ID = BX24.placement.info().placement;

        const validEntityTypes = ['CRM_DYNAMIC_1052_DETAIL_TAB', 'CRM_DEAL_DETAIL_TAB']
        isValidEntity.value = validEntityTypes.includes(entityInfo.ENTITY_ID)

      } catch (error) {
        console.error('Ошибка при проверке сущности:', error)
        isValidEntity.value = false
      } finally {
        loadingData.value = false
      }
    }

    const getTargetAudienceName = async (targetAudienceId) => {
      try {
        // Загружаем мероприятия при монтировании компонента
        const targetAudience = await new Promise((resolve, reject) => {
          BX24.callMethod(
            'lists.element.get',
            {
              'IBLOCK_TYPE_ID': 'lists',
              'IBLOCK_ID': '216',
            },
            (result) => {
              if (result.error()) {
                console.error("Error: ", result.error());
                reject(result.error());
              } else {
                //this.events = result.data();
                resolve(result.data());
              }
            }
          );
        });

        return targetAudience.title || `ЦА #${targetAudienceId}`
      } catch (error) {
        console.error('Ошибка получения названия ЦА:', error)
        return `ЦА #${targetAudienceId}`
      }
    }

    const getDealContacts = async (dealId) => {
      try {
        // Получаем сделку с контактами
        const deal = await new Promise((resolve) => {
            BX24.callMethod(
              "crm.deal.get",
              { id: dealId },
              function(result) {
                if (result.error()) {
                  console.error(result.error())
                  resolve({})
                } else {
                  resolve(result.data())
                }
              }
            )
          })
        if (!deal.CONTACT_ID) {
          return []
        }

        // Получаем контакты сделки
        const contactsIds = (await new Promise((resolve) => {
                  BX24.callMethod(
                    "crm.deal.contact.items.get",
                    { id: deal.ID },
                    function(result) {
                      if (result.error()) {
                        console.error(result.error())
                        resolve({})
                      } else {
                        console.log(result.data())
                        resolve(result.data().map(item => item.CONTACT_ID))
                      }
                    }
                  )
                }));
                console.log(contactsIds);
             const contacts = contactsIds.length > 0 ? await callApi("crm.contact.list", {"ID": contactsIds}, null) : null;

        // Получаем названия компаний и дополнительную информацию
        const contactsWithDetails = await Promise.all(
          contacts.map(async contact => {
            if (contact.COMPANY_ID) {
              try {
                const company = await new Promise((resolve) => {
            BX24.callMethod(
              "crm.company.get",
              { id: contact.COMPANY_ID },
              function(result) {
                if (result.error()) {
                  console.error(result.error())
                  resolve({})
                } else {
                  resolve(result.data())
                }
              }
            )
          })

                contact.COMPANY_TITLE = company.TITLE
              } catch (error) {
                console.error('Ошибка получения компании:', error)
                contact.COMPANY_TITLE = null
              }
            }
            
            // Получаем телефоны контакта
            try {
              const contactDetails = await new Promise((resolve) => {
                BX24.callMethod(
                  "crm.contact.get",
                  { id: contact.ID },
                  function(result) {
                    if (result.error()) {
                      console.error(result.error())
                      resolve({})
                    } else {
                      resolve(result.data())
                    }
                  }
                )
              })
              contact.PHONE = contactDetails.PHONE || []
            } catch (error) {
              console.error('Ошибка получения телефона контакта:', error)
              contact.PHONE = []
            }
            
            return contact
          })
        )

        return contactsWithDetails
      } catch (error) {
        console.error('Ошибка получения контактов сделки:', error)
        return []
      }
    }

    // Группировка контактов по компаниям
    const groupContactsByCompanies = (contacts) => {
      const companiesMap = new Map()
      const contactsWithoutCompany = []

      contacts.forEach(contact => {
        if (contact.COMPANY_ID && contact.COMPANY_TITLE) {
          if (!companiesMap.has(contact.COMPANY_ID)) {
            companiesMap.set(contact.COMPANY_ID, {
              id: contact.COMPANY_ID,
              name: contact.COMPANY_TITLE,
              contacts: []
            })
          }
          companiesMap.get(contact.COMPANY_ID).contacts.push(contact)
        } else {
          contactsWithoutCompany.push(contact)
        }
      })

      return {
        companies: Array.from(companiesMap.values()),
        contactsWithoutCompany
      }
    }

    // ... остальные методы остаются без изменений
    const getCurrentUser = () => {
      return new Promise((resolve) => {
        BX24.callMethod(
          "user.current",
          {},
          function(result) {
            if (result.error()) {
              console.error(result.error())
              resolve({})
            } else {
              resolve(result.data())
            }
          }
        )
      })
    }

    const getCurrentUserId = async () => {
      const currentUser = await getCurrentUser()
      return currentUser.ID
    }

    const addDealComment = async (dealId, comment) => {
      try {
        const authorId = await getCurrentUserId()
        await new Promise((resolve) => {
          BX24.callMethod(
            "crm.timeline.comment.add",
            {
              fields: {
                ENTITY_ID: dealId,
                ENTITY_TYPE: "deal",
                COMMENT: comment,
                AUTHOR_ID: authorId
              }
            },
            function(result) {
              if (result.error()) {
                console.error('Ошибка добавления комментария:', result.error())
              }
              resolve()
            }
          )
        })
      } catch (error) {
        console.error('Ошибка при добавлении комментария:', error)
      }
    }

    const showSnackbar = (message, color = 'success') => {
      snackbar.message = message
      snackbar.color = color
      snackbar.show = true
    }
const getLocationData = async () => {
  try {
    // Получаем города
    const cities = (await callApi("crm.item.list", {}, ["id", "title"], 1094));
    const citiesMap = new Map(cities.map(city => [city.id, city.title]));
    
    // Получаем регионы (предполагаем, что они в списке с ID 1053)
    const regions = (await callApi("crm.item.list", {}, ["id", "title"], 1108));
    const regionsMap = new Map(regions.map(region => [region.id, region.title]));
    
    // Получаем федеральные округа (предполагаем, что они в списке с ID 1054)
    const districts = (await callApi("crm.item.list", {}, ["id", "title"], 1112));
    const districtsMap = new Map(districts.map(district => [district.id, district.title]));
    
    return { citiesMap, regionsMap, districtsMap };
  } catch (error) {
    console.error('Ошибка получения данных о локациях:', error);
    return {
      citiesMap: new Map(),
      regionsMap: new Map(),
      districtsMap: new Map()
    };
  }
}

    const submitForm = async () => {
      if (!form.value.validate()) {
        showSnackbar('Заполните все обязательные поля', 'error')
        return
      }

      if (!formData.input.trim()) {
        showSnackbar('Введите текст сообщения', 'error')
        return
      }

      if (formData.files.length === 0) {
        showSnackbar('Добавьте хотя бы один файл', 'error')
        return
      }

      loading.value = true

      try {
        const currentUser = await getCurrentUser()

        let deals = []
        let eventTitle = ''

        if (entityInfo.ENTITY_ID === 'CRM_DYNAMIC_1052_DETAIL_TAB') {
          const eventId = entityInfo.ENTITY_VALUE_ID
          eventTitle = (await callApi("crm.item.list", {id: eventId}, ["title"], 1052))[0].title
          
          deals = await callApi("crm.deal.list", {
            CATEGORY_ID: "32",
            STAGE_ID: "C32:NEW",
            UF_CRM_1742797326: eventId.toString()
          }, ["ID", "CONTACT_ID"])

        } else if (entityInfo.ENTITY_ID === 'CRM_DEAL_DETAIL_TAB') {
          const dealId = entityInfo.ENTITY_VALUE_ID
          const dealInfo = await new Promise((resolve) => {
            BX24.callMethod(
              "crm.deal.get",
              { id: dealId },
              function(result) {
                if (result.error()) {
                  console.error(result.error())
                  resolve({})
                } else {
                  resolve(result.data())
                }
              }
            )
          })

          const eventId = dealInfo.UF_CRM_1742797326
          if (!eventId) {
            showSnackbar('В сделке не указано мероприятие', 'error')
            loading.value = false
            return
          }

          eventTitle = (await callApi("crm.item.list", {id: eventId}, ["title"], 1052))[0].title
          
          deals = [{
            ID: dealId,
            CONTACT_ID: dealInfo.CONTACT_ID
          }]

        } else {
          showSnackbar('Неизвестный тип сущности', 'error')
          loading.value = false
          return
        }

        if (deals.length === 0) {
          showSnackbar('Нет сделок для обработки', 'warning')
          loading.value = false
          return
        }

        let processedDeals = 0
        let skippedDeals = 0

        for (const deal of deals) {
          try {
            const dealContacts = await callApi("crm.contact.list", 
              { ID: deal.CONTACT_ID }, 
              ["ID", "EMAIL", "NAME", "COMPANY_ID", "LAST_NAME", "FIRST_NAME", "SECOND_NAME"]
            )

            let hasValidEmail = false
            let emailSent = false

            for (const contact of dealContacts) {
              if (!contact.EMAIL || contact.EMAIL.length === 0 || !contact.EMAIL[0].VALUE) {
                console.warn(`Контакт ${contact.NAME} не имеет email`)
                continue
              }

              hasValidEmail = true

              let contactCompany = {}
              if (contact.COMPANY_ID) {
                contactCompany = await new Promise((resolve) => {
                  BX24.callMethod(
                    "crm.company.get",
                    { id: contact.COMPANY_ID },
                    function(result) {
                      if (result.error()) {
                        console.error(result.error())
                        resolve({})
                      } else {
                        resolve(result.data())
                      }
                    }
                  )
                })
              }

              const message = `${contact.NAME}, здравствуйте!\n\n${formData.input}\n\nС уважением, ${currentUser.LAST_NAME || ""} ${currentUser.NAME || ""} ${currentUser.SECOND_NAME || ""}\n${currentUser.WORK_POSITION || ""}`
              
              const emailFormData = new FormData()
              
              emailFormData.append('to', contact.EMAIL[0].VALUE)
              emailFormData.append('subject', `Приглашаем вас принять участие в мероприятии "${eventTitle}"`)
              emailFormData.append('contact', `${contact.NAME}, здравствуйте!`)
              emailFormData.append('input', formData.input)
              emailFormData.append('worker', `С уважением,менеджер отдела продаж ${currentUser.LAST_NAME || ""} ${currentUser.NAME || ""} ${currentUser.SECOND_NAME || ""}`)
              emailFormData.append('position', currentUser.WORK_POSITION || "")
              emailFormData.append('from_email', currentUser.EMAIL)
              emailFormData.append('phone', currentUser.PERSONAL_MOBILE)
              emailFormData.append('from_name', `${currentUser.LAST_NAME || ""} ${currentUser.NAME || ""} ${currentUser.SECOND_NAME || ""}`)
              
              formData.files.forEach((file, index) => {
                emailFormData.append(`file${index}`, file)
              })

              const response = await fetch('https://master.rymar-consulting.ru/email.php', {
                method: 'POST',
                body: emailFormData
              })

              const result = await response.json()
              
              if (result.success) {
                emailSent = true
              } else {
                console.error('Ошибка отправки email:', result.message)
              }
            }

            if (!hasValidEmail) {
              await addDealComment(deal.ID, 'Рассылка не проведена: у контактов отсутствует email')
              skippedDeals++
              continue
            }

            if (emailSent) {
              await new Promise((resolve) => {
                BX24.callMethod(
                  "crm.deal.update",
                  {
                    id: deal.ID,
                    fields: {
                      STAGE_ID: "C32:PREPARATION"
                    }
                  },
                  function(result) {
                    if (result.error()) {
                      console.error(result.error())
                    }
                    resolve()
                  }
                )
              })
              processedDeals++
            }

          } catch (error) {
            console.error('Ошибка обработки сделки:', error)
            await addDealComment(deal.ID, `Ошибка обработки: ${error.message}`)
          }
        }

        if (processedDeals > 0) {
          showSnackbar(`Обработка завершена. Успешно: ${processedDeals}, пропущено: ${skippedDeals}`, 'success')
        } else if (skippedDeals > 0) {
          showSnackbar(`Все сделки пропущены (отсутствуют email у контактов): ${skippedDeals}`, 'warning')
        } else {
          showSnackbar('Не удалось обработать сделки', 'error')
        }

        form.value.reset()
        formData.files = []

      } catch (error) {
        console.error('Общая ошибка:', error)
        showSnackbar('Ошибка: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    // Наблюдатели
    watch(() => formData.input, () => {
      if (form.value) {
        form.value.validate()
      }
    })

    watch(() => formData.files, () => {
      if (form.value) {
        form.value.validate()
      }
    })

    // Автоматическая загрузка контактов при переходе на вкладку
    watch(activeTab, (newTab) => {
      if (newTab === 'contacts' && groupedContacts.value.length === 0) {
        loadContacts()
      }
    })

    // Хуки жизненного цикла
    onMounted(() => {
      BX24.ready(function () {
        BX24.init(async function () {
          await checkEntityValidity()
        })
      })
    })

    // Возвращаем все переменные и методы
    return {
      loadingData,
      loading,
      loadingContacts,
      isValidEntity,
      activeTab,
      form,
      formData,
      snackbar,
      groupedContacts,
      errorMessage,
      requiredRules,
      fileRules,
      isFormValid,
      totalContacts,
      totalDeals,
      totalCompanies,
      totalContactsWithoutCompany,
      submitForm,
      showSnackbar,
      loadContacts,
      getFormattedLocation,
    }
  }
}
</script>

<style>

.link{
  color: black;
}

.v-card .v-card-text{
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.text-error {
  color: #f44336;
}

.text-medium-emphasis {
  color: rgba(0, 0, 0, 0.6);
}

.companies-container {
  margin-bottom: 1rem;
}
</style>