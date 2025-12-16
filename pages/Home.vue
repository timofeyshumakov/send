<template>
    <!-- Состояние загрузки данных -->
    <v-card v-if="loadingData" class="text-center pa-4">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
      <div class="mt-2">Загрузка данных...</div>
    </v-card>

    <!-- Состояние неверной сущности !isValidEntity-->
    <v-card v-else-if="false" class="text-center pa-4">
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

                <!-- Отображение пользователей и их рассылок -->
                <div v-else-if="userDistributions.length > 0">
                    <!-- Для каждого пользователя -->
                    <div v-for="(userDistribution, userIndex) in userDistributions" 
                         :key="userIndex" 
                         class="mb-6">
                        
                        <!-- Заголовок пользователя -->
                        <v-card variant="outlined" class="mb-2">
                            <v-card-text class="pa-3">
                                <div class="d-flex justify-space-between align-center">
                                    <div>
                                        <strong class="text-h6">{{ userDistribution.userName }}</strong>
                                    </div>
                                    <div class="text-caption text-medium-emphasis">
                                        Рассылок: {{ userDistribution.distributions.length }}
                                    </div>
                                </div>
                            </v-card-text>
                        </v-card>
                        
                        <!-- Для каждой рассылки пользователя -->
                        <div v-for="(distribution, distIndex) in userDistribution.distributions" 
                             :key="distIndex" 
                             class="mb-4">
                            
                            <!-- Заголовок рассылки -->
                            <v-card variant="tonal" class="mb-2">
                                <v-card-text class="pa-2">
                                    <div class="d-flex justify-space-between align-center">
                                        <div>
                                            <strong>Рассылка {{ distIndex + 1 }}</strong>
                                            <div class="text-caption">
                                                ЦА рассылки: {{ distribution.distributionTargetAudience || 'Не указана' }}
                                            </div>
                                        </div>
                                        <div class="text-caption text-medium-emphasis">
                                            Компаний: {{ distribution.companies.length }}
                                            <br>
                                            Контактов: {{ distribution.totalContacts }}
                                        </div>
                                    </div>
                                </v-card-text>
                            </v-card>
                            
                            <!-- Компании в рассылке -->
                            <div v-for="(company, companyIndex) in distribution.companies" 
                                 :key="companyIndex" 
                                 class="mb-4">
                                
                                <!-- Заголовок компании -->
                                <v-card variant="outlined" class="mb-2">
                                    <v-card-text class="pa-2">
                                        <div class="d-flex justify-space-between align-center">
                                            <div>
                                                <strong>{{ company.companyName || 'Без компании' }}</strong>
                                            </div>
                                            <div class="text-caption text-medium-emphasis">
                                                Контактов: {{ company.contacts.length }}
                                            </div>
                                        </div>
                                    </v-card-text>
                                </v-card>
                                
                                <!-- Таблица контактов компании -->
                                <v-table density="compact" class="company-contacts-table mb-4">
                                    <thead>
                                        <tr>
                                            <th>ФИО</th>
                                            <th>ЦА контакта</th>
                                            <th>Должность</th>
                                            <th>Email</th>
                                            <th></th>
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
                                                <span v-if="contact.CONTACT_TARGET_AUDIENCE && contact.CONTACT_TARGET_AUDIENCE !== 'Не указана'">
                                                    {{ contact.CONTACT_TARGET_AUDIENCE }}
                                                </span>
                                                <span v-else class="text-medium-emphasis">Не указана</span>
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
                                                <v-btn
                                                    icon
                                                    size="x-small"
                                                    :color="isExcluded(contact.ID) ? 'error' : 'success'"
                                                    @click="toggleExcludeContact(contact.ID)"
                                                    :title="isExcluded(contact.ID) ? 'Включить в рассылку' : 'Исключить из рассылки'"
                                                >
                                                    <v-icon v-if="isExcluded(contact.ID)">mdi-plus-circle</v-icon>
                                                    <v-icon v-else>mdi-close-circle</v-icon>
                                                </v-btn>
                                            </td>
                                        </tr>
                                    </tbody>
                                </v-table>
                            </div>
                        </div>
                    </div>
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
import { callApi, getListElements } from '../functions/callApi'

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
    const userDistributions = ref([])

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

    const deals = ref([])
    const excludedContacts = ref(new Set());
    const excludedContactsCount = computed(() => {
          return excludedContacts.value.size
    })
// Метод для группировки сделок по пользователям и рассылкам
// Метод для группировки сделок по пользователям и рассылкам
const groupDealsByUserAndDistribution = async () => {
    if (!deals.value.length) return []

    try {
        // Собираем все ID пользователей из сделок
        const allUserIds = [...new Set(deals.value.map(deal => deal.ASSIGNED_BY_ID).filter(id => id))]
        
        // Получаем информацию о пользователях
        const userCommands = allUserIds.map(userId => ({
            method: 'user.get',
            params: { ID: userId }
        }))
        
        const userResults = await callBatch(userCommands)
        
        // Создаем Map пользователей
        const userMap = new Map()
        userResults.forEach((userData, index) => {
            const userId = allUserIds[index]
            if (userData && userData.length > 0) {
                const user = userData[0]
                userMap.set(userId, {
                    ID: userId,
                    NAME: user.NAME,
                    LAST_NAME: user.LAST_NAME,
                    SECOND_NAME: user.SECOND_NAME,
                    FULL_NAME: `${user.LAST_NAME || ''} ${user.NAME || ''} ${user.SECOND_NAME || ''}`.trim()
                })
            }
        })

        // Группируем сделки по пользователям
        const userGroups = new Map()
        
        deals.value.forEach(deal => {
            const userId = deal.ASSIGNED_BY_ID
            if (!userGroups.has(userId)) {
                const userInfo = userMap.get(userId) || {
                    ID: userId,
                    FULL_NAME: `Пользователь ${userId}`
                }
                userGroups.set(userId, {
                    user: userInfo,
                    deals: []
                })
            }
            userGroups.get(userId).deals.push(deal)
        })

        // Для каждого пользователя группируем сделки по рассылкам
        const result = []
        
        for (const [userId, userGroup] of userGroups) {
            // Группируем сделки по ID рассылки (поле UF_CRM_1765531909)
            const distributionGroups = new Map()
            
            userGroup.deals.forEach(deal => {
                const distributionId = deal.UF_CRM_1765531909 || 'no_distribution'
                
                if (!distributionGroups.has(distributionId)) {
                    distributionGroups.set(distributionId, {
                        distributionId,
                        deals: []
                    })
                }
                distributionGroups.get(distributionId).deals.push(deal)
            })

            // Преобразуем группы рассылок в нужный формат
            const distributions = []

            for (const [distId, distGroup] of distributionGroups) {
                // Определяем ЦА рассылки - используем поле DEAL_TARGET_AUDIENCE
                let distributionTargetAudience = 'Не указана'
                if (distGroup.deals.length > 0) {
                    const firstDeal = distGroup.deals[0];
                    // ИСПРАВЛЕНО: обращаемся к DEAL_TARGET_AUDIENCE, который создается в loadContacts
                    distributionTargetAudience = firstDeal.DEAL_TARGET_AUDIENCE || 'Не указана'
                    
                    // Если DEAL_TARGET_AUDIENCE не найден, проверяем UF_CRM_1753365812
                    if (distributionTargetAudience === 'Не указана' && firstDeal.UF_CRM_1753365812) {
                        // Получаем названия ЦА для UF_CRM_1753365812
                        const dealTaIds = Array.isArray(firstDeal.UF_CRM_1753365812) 
                            ? firstDeal.UF_CRM_1753365812 
                            : [firstDeal.UF_CRM_1753365812]
                        
                        if (dealTaIds.length > 0) {
                            const dealTaMap = await getTargetAudienceNames(dealTaIds)
                            const targetAudienceNames = dealTaIds
                                .map(id => dealTaMap.get(parseInt(id)))
                                .filter(name => name)
                            
                            if (targetAudienceNames.length > 0) {
                                distributionTargetAudience = targetAudienceNames.join(', ')
                            }
                        }
                    }
                }

                // Собираем все уникальные контакты для этой рассылки
                const uniqueContactsMap = new Map() // Используем Map для хранения уникальных контактов по ID
                
                distGroup.deals.forEach(deal => {
                    if (deal.contacts && deal.contacts.length > 0) {
                        deal.contacts.forEach(contact => {
                            // Проверяем, нет ли уже такого контакта в Map
                            if (!uniqueContactsMap.has(contact.ID)) {
                                uniqueContactsMap.set(contact.ID, {
                                    ...contact,
                                    dealTitle: deal.TITLE || `Сделка #${deal.ID}`
                                })
                            }
                        })
                    }
                })

                // Преобразуем Map уникальных контактов в массив
                const allContacts = Array.from(uniqueContactsMap.values())

                // Группируем контакты по компаниям
                const companyMap = new Map()
                
                allContacts.forEach(contact => {
                    const companyId = contact.COMPANY_ID || 'no_company'
                    const companyName = contact.COMPANY_TITLE || 'Без компании'
                    const targetAudience = contact.companyTarget || 'Не указана'
                    
                    if (!companyMap.has(companyId)) {
                        companyMap.set(companyId, {
                            companyId,
                            companyName,
                            targetAudience,
                            contacts: []
                        })
                    }
                    
                    // Добавляем контакт только если его еще нет в списке контактов компании
                    const existingContact = companyMap.get(companyId).contacts.find(c => c.ID === contact.ID)
                    if (!existingContact) {
                        companyMap.get(companyId).contacts.push(contact)
                    }
                })

                const totalContacts = allContacts.length

                distributions.push({
                    distributionId: distId,
                    distributionTargetAudience,
                    totalContacts,
                    companies: Array.from(companyMap.values())
                })
            }

            // Собираем все ЦА пользователя (уникальные из всех его рассылок)
            const userTargetAudiences = [...new Set(
                distributions.map(d => d.distributionTargetAudience)
                    .filter(ta => ta !== 'Не указана')
            )]

            result.push({
                userId: userId,
                userName: userGroup.user.FULL_NAME,
                targetAudiences: userTargetAudiences,
                distributions: distributions
            })
        }

        return result
        
    } catch (error) {
        console.error('Ошибка группировки по пользователям:', error)
        return []
    }
}
// Вычисляемое свойство для группировки контактов по компаниям
    const contactsByCompany = computed(() => {
      if (!deals.value.length) return []
      
      // Собираем все контакты из всех сделок
      const allContacts = []
      deals.value.forEach(deal => {
        if (deal.contacts && deal.contacts.length > 0) {
          deal.contacts.forEach(contact => {
            // Добавляем информацию о сделке к контакту
            allContacts.push({
              ...contact,
              dealTitle: deal.TITLE || `Сделка #${deal.ID}`
            })
          })
        }
      })
      
      // Группируем контакты по компании
      const companyMap = new Map()
      
      allContacts.forEach(contact => {
        const companyId = contact.COMPANY_ID || 'no_company'
        const companyName = contact.COMPANY_TITLE || 'Без компании'
        const targetAudience = contact.companyTarget || 'Не указана'
        
        if (!companyMap.has(companyId)) {
          companyMap.set(companyId, {
            companyId,
            companyName,
            targetAudience,
            contacts: []
          })
        }
        
        companyMap.get(companyId).contacts.push(contact)
      })
      
      // Преобразуем Map в массив
      return Array.from(companyMap.values())
    })
    
    const isExcluded = (contactId) => {
      return excludedContacts.value.has(+contactId)
    }

    const toggleExcludeContact = async (contactId) => {
      const wasExcluded = excludedContacts.value.has(+contactId)
      
      if (wasExcluded) {
        excludedContacts.value.delete(+contactId)
      } else {
        excludedContacts.value.add(+contactId)
      }
      
      // Сохраняем изменения в поле сущности
      await saveExcludedContacts()
      showSnackbar(
        wasExcluded ? 'Контакт включен в рассылку' : 'Контакт исключен из рассылки',
        wasExcluded ? 'success' : 'info'
      )
    }
const filteredDeals = computed(() => {
      if (!deals.value.length) return []
      
      return deals.value.map(deal => {
        const filteredDeal = { ...deal }
        filteredDeal.contacts = filteredDeal.contacts.filter(contact => !excludedContacts.value.has(+contact.ID))
        return filteredDeal
      }).filter(deal => deal.contacts.length > 0)
    })

const getExcludedCount = (deal) => {
      if (!deal.contacts) return 0
      
      return deal.contacts.filter(contact => excludedContacts.value.has(+contact.ID)).length
    }

    // Сохранение исключенных контактов в поле сущности
    const saveExcludedContacts = async () => {
      try {
        const excludedArray = Array.from(excludedContacts.value)
        const excludedString = excludedArray.join(',')
        
        if (entityInfo.ENTITY_ID === 'CRM_DYNAMIC_1052_DETAIL_TAB') {
          // Для мероприятия
          await new Promise((resolve) => {
            BX24.callMethod(
              "crm.item.update",
              {
                id: entityInfo.ENTITY_VALUE_ID,
                entityTypeId: 1052,
                fields: {
                  ufCrm38ExcludedContacts: excludedString
                }
              },
              function(result) {
                if (result.error()) {
                  console.error('Ошибка сохранения исключенных контактов:', result.error())
                }
                resolve()
              }
            )
          })
        } else if (entityInfo.ENTITY_ID === 'CRM_DEAL_DETAIL_TAB') {
          // Для сделки
          await new Promise((resolve) => {
            BX24.callMethod(
              "crm.deal.update",
              {
                id: entityInfo.ENTITY_VALUE_ID,
                fields: {
                  CONTACT_ID: excludedString
                }
              },
              function(result) {
                if (result.error()) {
                  console.error('Ошибка сохранения исключенных контактов:', result.error())
                }
                resolve()
              }
            )
          })
        }
      } catch (error) {
        console.error('Ошибка при сохранении исключенных контактов:', error)
      }
    }

    // Загрузка исключенных контактов из поля сущности
    const loadExcludedContacts = async () => {
      try {
        let excludedString = ''
        
        if (entityInfo.ENTITY_ID === 'CRM_DYNAMIC_1052_DETAIL_TAB') {
          // Для мероприятия
          const eventData = await new Promise((resolve) => {
            BX24.callMethod(
              "crm.item.get",
              {
                id: entityInfo.ENTITY_VALUE_ID,
                entityTypeId: 1052
              },
              function(result) {
                if (result.error()) {
                  console.error('Ошибка загрузки данных мероприятия:', result.error())
                  resolve({})
                } else {
                  resolve(result.data())
                }
              }
            )
          })
          excludedString = eventData.item.ufCrm38ExcludedContacts || ''
        } else if (entityInfo.ENTITY_ID === 'CRM_DEAL_DETAIL_TAB') {
          // Для сделки
          const dealData = await new Promise((resolve) => {
            BX24.callMethod(
              "crm.deal.get",
              {
                id: entityInfo.ENTITY_VALUE_ID
              },
              function(result) {
                if (result.error()) {
                  console.error('Ошибка загрузки данных сделки:', result.error())
                  resolve({})
                } else {
                  resolve(result.data())
                }
              }
            )
          })
          excludedString = dealData.CONTACT_ID || ''
        }
        
        // Преобразуем строку обратно в Set
        if (excludedString) {
          const excludedArray = excludedString.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))
          excludedContacts.value = new Set(excludedArray)
        }
      } catch (error) {
        console.error('Ошибка при загрузке исключенных контактов:', error)
      }
    }


    const requiredRules = [
      v => !!v || 'Обязательное поле',
      v => (v && v.trim().length > 0) || 'Поле не может быть пустым'
    ]
    
    const fileRules = [
      v => !v || v.length === 0 || v.some(file => file) || 'Загрузите хотя бы один файл'
    ]

    // Вычисляемые свойства
    const isFormValid = computed(() => {
      return formData.input && formData.input.length > 0 && formData.files && formData.files.length > 0
    })

    const totalContacts = computed(() => {
      return deals.value.reduce((total, deal) => total + deal.contacts.length, 0)
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
    const getEventDeals = async (eventId, currentUserId) => {
      try {
        const filter = {
          UF_CRM_1742797326: eventId,
          CATEGORY_ID: "32",
          STAGE_ID: "C32:NEW"
        };
        if (currentUserId !== 1612) {
          data.ASSIGNED_BY_ID = currentUserId;
        }

        const addedDeals = await callApi(
          "crm.deal.list",
          filter,
          ["ID", "TITLE", "UF_CRM_1753365812", 'ASSIGNED_BY_ID']
        );
        
        if (!addedDeals || addedDeals.length === 0) {
          return []
        }

        return addedDeals
      } catch (error) {
        console.error('Ошибка получения сделок мероприятия:', error)
        throw error
      }
    }

    // Оптимизированный метод получения контактов сделок
    const getDealsContacts = async (dealIds) => {
      try {
        console.log(dealIds);
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

const getTargetAudienceNames = async (targetAudienceIds) => {
  try {
    const uniqueIds = [...new Set(targetAudienceIds)].map(id => parseInt(id)).filter(id => !isNaN(id));
    
    if (uniqueIds.length === 0) {
      return new Map();
    }

    const results = await getListElements(216, { ID: uniqueIds }, ["ID", "NAME"]);
    
    const nameMap = new Map();
    
    // Исправляем: сопоставляем по ID элемента
    results.forEach((result) => {
      if (result && result.ID) {
        const id = parseInt(result.ID);
        nameMap.set(id, result.NAME || `ЦА #${id}`);
      }
    });

    // Добавляем значения для ID, которые не нашлись
    uniqueIds.forEach(id => {
      if (!nameMap.has(id)) {
        nameMap.set(id, `ЦА #${id}`);
      }
    });

    return nameMap;
  } catch (error) {
    console.error('Ошибка получения названий ЦА:', error);
    const defaultMap = new Map();
    targetAudienceIds.forEach(id => {
      const numId = parseInt(id);
      if (!isNaN(numId)) {
        defaultMap.set(numId, `ЦА #${numId}`);
      }
    });
    return defaultMap;
  }
}

    // Оптимизированный метод получения детальной информации о контактах
// Исправленный метод получения детальной информации о контактах
const getContactsDetails = async (contactIds) => {
  try {
    const uniqueContactIds = [...new Set(contactIds)];

    const chunks = [];
    const chunkSize = 50;
    // Разделяем на чанки
    for (let i = 0; i < uniqueContactIds.length; i += chunkSize) {
      chunks.push(uniqueContactIds.slice(i, i + chunkSize));
    }
    
    const contactResults = [];
    
    // Выполняем запросы последовательно
    for (const chunk of chunks) {
      try {
        // ДОБАВЛЯЕМ UF_CRM_1753364801 В ВЫБОРКУ
        const chunkResults = await callApi('crm.contact.list', { ID: chunk }, [
          "ID", "EMAIL", "NAME", "COMPANY_ID", "LAST_NAME", 
          "FIRST_NAME", "SECOND_NAME", "POST", "UF_CRM_1753364801" // ДОБАВЛЕНО
        ]);
        // Добавляем все результаты
        if (Array.isArray(chunkResults)) {
          contactResults.push(...chunkResults);
        }
      } catch (error) {
        console.error(`Ошибка при выполнении запроса контактов для чанка:`, error);
      }
    }

    // Исправляем: создаем Map, где ключ - ID контакта
    const contactDetailsMap = new Map();
    
    // Заполняем Map данными контактов
    contactResults.forEach((contact) => {
      if (contact && contact.ID) {
        contactDetailsMap.set(parseInt(contact.ID), contact);
      }
    });

    // Собираем ID компаний для дополнительных запросов
    const companyIds = [];
    
    // Проходим по всем запрошенным контактам и собираем ID компаний
    uniqueContactIds.forEach(contactId => {
      const contact = contactDetailsMap.get(parseInt(contactId));
      if (contact && contact.COMPANY_ID) {
        companyIds.push(parseInt(contact.COMPANY_ID));
      }
    });

    // Получаем информацию о компаниях
    if (companyIds.length > 0) {
      const uniqueCompanyIds = [...new Set(companyIds)];

      const companyChunks = [];
      // Разделяем на чанки
      for (let i = 0; i < uniqueCompanyIds.length; i += chunkSize) {
        companyChunks.push(uniqueCompanyIds.slice(i, i + chunkSize));
      }
      
      const companyResults = [];
      
      // Выполняем запросы последовательно
      for (const chunk of companyChunks) {
        try {
          const chunkResults = await callApi('crm.company.list', { ID: chunk }, ["ID", "TITLE", "UF_CRM_1753364407"]);
          if (Array.isArray(chunkResults)) {
            companyResults.push(...chunkResults);
          }
        } catch (error) {
          console.error(`Ошибка при выполнении запроса компаний для чанка:`, error);
        }
      }

      // Исправляем: создаем Map для компаний, где ключ - ID компании
      const companyMap = new Map();
      companyResults.forEach((company) => {
        if (company && company.ID) {
          companyMap.set(parseInt(company.ID), company);
        }
      });

      // Получаем названия целевых аудиторий компаний
      const allCompanyTaIds = companyResults
        .filter(company => company.UF_CRM_1753364407)
        .flatMap(company => company.UF_CRM_1753364407 || []);
      
      const companyTaMap = await getTargetAudienceNames(allCompanyTaIds);
      
      // Обновляем компании с названиями целевых аудиторий
      companyResults.forEach((company) => {
        if (company && company.ID && company.UF_CRM_1753364407) {
          const taIds = company.UF_CRM_1753364407 || [];
          company.targetAudienceNames = taIds
            .map(id => companyTaMap.get(parseInt(id)))
            .filter(name => name)
            .join(', ');
        }
      });

      // Обновляем Map компаний
      companyResults.forEach((company) => {
        if (company && company.ID) {
          companyMap.set(parseInt(company.ID), company);
        }
      });

      // Обновляем контакты с названиями компаний и целевых аудиторий
      uniqueContactIds.forEach(contactId => {
        const contact = contactDetailsMap.get(parseInt(contactId));
        if (contact && contact.COMPANY_ID) {
          const companyId = parseInt(contact.COMPANY_ID);
          if (companyMap.has(companyId)) {
            const company = companyMap.get(companyId);
            contact.COMPANY_TITLE = company.TITLE || 'Без названия';
            contact.companyTarget = company.targetAudienceNames || 'Не указана';
          }
        }
      });
    }

    return contactDetailsMap;
  } catch (error) {
    console.error('Ошибка получения детальной информации о контактах:', error);
    throw error;
  }
}

const loadContacts = async () => {
  //if (!isValidEntity.value) return

  loadingContacts.value = true
  errorMessage.value = ''
  deals.value = []

  try {
    let eventId
    console.log(entityInfo);
    if (entityInfo.ENTITY_ID === 'CRM_DYNAMIC_1052_DETAIL_TAB') {
      eventId = entityInfo.ENTITY_VALUE_ID
    } else if (entityInfo.ENTITY_ID === 'CRM_DEAL_DETAIL_TAB') {
      const dealInfo = await callApi(
          "crm.deal.get",
          { id: entityInfo.ENTITY_VALUE_ID },
          ["UF_CRM_1742797326"] // ДОБАВЛЕНО
        )
      eventId = dealInfo.UF_CRM_1742797326
    }

    if (!eventId) {
      errorMessage.value = 'Не удалось определить мероприятие'
      return
    }

    const currentUserId = await getCurrentUserId()

    // Получаем сделки мероприятия с фильтром
    const eventDeals = await getEventDeals(eventId, currentUserId)

    if (eventDeals.length === 0) {
      errorMessage.value = 'Мероприятие не содержит подходящих сделок'
      return
    }

    // Собираем все ID для batch-запросов
    const allDealIds = eventDeals.map(deal => deal.ID)

    // Получаем контакты всех сделок
    const dealsContactsMap = await getDealsContacts(allDealIds)
    
    // Собираем все ID контактов
    const allContactIds = Array.from(dealsContactsMap.values()).flat()
            
    // Получаем детальную информацию о всех контактах
    const contactsDetailsMap = await getContactsDetails(allContactIds)
    
    // Получаем названия целевых аудиторий для контактов и сделок
    const allContactTargetAudienceIds = []
    const allDealTargetAudienceIds = []
    
    // Собираем ID целевых аудиторий из контактов
    allContactIds.forEach(contactId => {
      const contact = contactsDetailsMap.get(contactId)
      if (contact && contact.UF_CRM_1753364801) {
        const taIds = Array.isArray(contact.UF_CRM_1753364801) ? contact.UF_CRM_1753364801 : [contact.UF_CRM_1753364801]
        allContactTargetAudienceIds.push(...taIds)
      }
    })
    
    // Собираем ID целевых аудиторий из сделок
    eventDeals.forEach(deal => {
      if (deal.UF_CRM_1753365812) {
        const taIds = Array.isArray(deal.UF_CRM_1753365812) ? deal.UF_CRM_1753365812 : [deal.UF_CRM_1753365812]
        allDealTargetAudienceIds.push(...taIds)
      }
    })
    
    // Получаем названия целевых аудиторий
    const contactTaMap = await getTargetAudienceNames(allContactTargetAudienceIds)
    const dealTaMap = await getTargetAudienceNames(allDealTargetAudienceIds)

    // Формируем список сделок с контактами
    const dealsData = []

    for (const deal of eventDeals) {
      const dealObj = {
        ...deal,
        contacts: []
      }

      const contactIds = dealsContactsMap.get(deal.ID) || []
      contactIds.forEach(contactId => {
        const contactDetails = contactsDetailsMap.get(contactId)
        if (contactDetails) {
          // Добавляем информацию о целевой аудитории контакта
          let contactTargetAudience = 'Не указана'
          
          if (contactDetails.UF_CRM_1753364801) {
            const taIds = Array.isArray(contactDetails.UF_CRM_1753364801) 
              ? contactDetails.UF_CRM_1753364801 
              : [contactDetails.UF_CRM_1753364801]
            
            // Получаем названия целевых аудиторий контакта
            const targetAudienceNames = taIds
              .map(id => contactTaMap.get(parseInt(id)))
              .filter(name => name)
            
            if (targetAudienceNames.length > 0) {
              contactTargetAudience = targetAudienceNames.join(', ')
            }
          }
          
          // Добавляем информацию о целевой аудитории сделки
          let dealTargetAudience = 'Не указана'
          if (deal.UF_CRM_1753365812) {
            const dealTaIds = Array.isArray(deal.UF_CRM_1753365812) 
              ? deal.UF_CRM_1753365812 
              : [deal.UF_CRM_1753365812]
            
            const dealTargetAudienceNames = dealTaIds
              .map(id => dealTaMap.get(parseInt(id)))
              .filter(name => name)
            
            if (dealTargetAudienceNames.length > 0) {
              dealTargetAudience = dealTargetAudienceNames.join(', ')
            }
          }
          
          // Сохраняем обе целевые аудитории в контакте
          const enrichedContact = {
            ...contactDetails,
            CONTACT_TARGET_AUDIENCE: contactTargetAudience,
            DEAL_TARGET_AUDIENCE: dealTargetAudience,
            dealTitle: deal.TITLE || `Сделка #${deal.ID}`
          }
          
          dealObj.contacts.push(enrichedContact)
        }
      })

      if (dealObj.contacts.length > 0) {
        dealsData.push(dealObj)
      }
    }
    console.log(eventDeals);
    deals.value = dealsData
    if (deals.value.length > 0) {
      userDistributions.value = await groupDealsByUserAndDistribution()
    }
  } catch (error) {
    console.error('Ошибка загрузки контактов:', error)
    errorMessage.value = 'Ошибка загрузки контактов: ' + error.message
  } finally {
    loadingContacts.value = false
  }
}
    const checkEntityValidity = async () => {
      try {
        try {
            // Пробуем получить значения переменных
            entityInfo.ENTITY_VALUE_ID = BX24.placement.info().options.ID;
            entityInfo.ENTITY_ID = BX24.placement.info().placement;
        } catch (error) {
            entityInfo.ENTITY_VALUE_ID = 108;
            entityInfo.ENTITY_ID = 'CRM_DYNAMIC_1052_DETAIL_TAB';
        }
        
        if(entityInfo.ENTITY_VALUE_ID === undefined){
          entityInfo.ENTITY_VALUE_ID = 108;
        }
        console.log(entityInfo.ENTITY_VALUE_ID);
        if(entityInfo.ENTITY_ID = "DEFAULT"){
          entityInfo.ENTITY_ID = 'CRM_DYNAMIC_1052_DETAIL_TAB';
        }

        const validEntityTypes = ['CRM_DYNAMIC_1052_DETAIL_TAB', 'CRM_DEAL_DETAIL_TAB']
        isValidEntity.value = validEntityTypes.includes(entityInfo.ENTITY_ID)
        if (isValidEntity.value) {
          // Загружаем исключенные контакты при инициализации
          await loadExcludedContacts()
        }
      } catch (error) {
        console.error('Ошибка при проверке сущности:', error)
        isValidEntity.value = false
      } finally {
        loadingData.value = false
      }
    }

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
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
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
    // Кодируем файлы в base64
    const encodedFiles = await encodeFilesToBase64(formData.files);
    
    // Для первого файла
    const file = encodedFiles[0];
    const currentUser = await getCurrentUser()

    let eventTitle = ''

    // Получаем название мероприятия
    if (entityInfo.ENTITY_ID === 'CRM_DYNAMIC_1052_DETAIL_TAB') {
      // Для мероприятия
      const eventId = entityInfo.ENTITY_VALUE_ID
      const eventData = await callApi("crm.item.list", {id: eventId}, ["title"], 1052)
      eventTitle = eventData[0]?.title || 'Мероприятие'
      
      // Сохраняем файл в поле мероприятия
      await new Promise((resolve) => {
        BX24.callMethod(
          "crm.item.update",
          {
            id: eventId,
            entityTypeId: 1052,
            fields: {
              ufCrm38_1758702557: [file.name, file.base64]
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

    } else if (entityInfo.ENTITY_ID === 'CRM_DEAL_DETAIL_TAB') {
      // Для сделки - получаем мероприятие из сделки
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

      const eventData = await callApi("crm.item.list", {id: eventId}, ["title"], 1052)
      eventTitle = eventData[0]?.title || 'Мероприятие'
      
      // Сохраняем файл в поле сделки
      await new Promise((resolve) => {
        BX24.callMethod(
          "crm.deal.update",
          {
            id: dealId,
            fields: {
              UF_CRM_1758634964: [file.name, file.base64]
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
    } else {
      showSnackbar('Неизвестный тип сущности', 'error')
      loading.value = false
      return
    }

    // СОБИРАЕМ ВСЕ КОНТАКТЫ ИЗ ВСЕХ РАССЫЛОК ПОЛЬЗОВАТЕЛЕЙ
    // ИСКЛЮЧАЕМ КОНТАКТЫ, КОТОРЫЕ БЫЛИ ИСКЛЮЧЕНЫ ВО ВКЛАДКЕ "КОНТАКТЫ"
    const allContacts = []
    const contactDealMap = new Map() // Связь контакт -> сделка(и)

    // Проходим по всем пользователям и их рассылкам
    for (const userDistribution of userDistributions.value) {
      for (const distribution of userDistribution.distributions) {
        for (const company of distribution.companies) {
          for (const contact of company.contacts) {
            // Проверяем, не исключен ли контакт
            if (excludedContacts.value.has(+contact.ID)) {
              console.log(`Контакт ${contact.ID} исключен из рассылки`)
              continue
            }

            // Проверяем, есть ли у контакта email
            if (!contact.EMAIL || contact.EMAIL.length === 0 || !contact.EMAIL[0]?.VALUE) {
              console.log(`У контакта ${contact.ID} нет email`)
              continue
            }

            // Добавляем контакт только если его еще нет в списке
            const existingContact = allContacts.find(c => c.ID === contact.ID)
            if (!existingContact) {
              allContacts.push(contact)
              
              // Находим связанную сделку для этого контакта
              // ВАЖНО: в вашем коде contact может не содержать информацию о сделке
              // Нужно найти сделку, которая содержит этот контакт
              if (!contactDealMap.has(contact.ID)) {
                contactDealMap.set(contact.ID, [])
              }
              
              // Ищем сделку, в которой есть этот контакт
              for (const deal of deals.value) {
                if (deal.contacts && deal.contacts.some(c => c.ID === contact.ID)) {
                  contactDealMap.get(contact.ID).push(deal.ID)
                  break
                }
              }
            }
          }
        }
      }
    }

    if (allContacts.length === 0) {
      showSnackbar('Нет контактов с email для рассылки', 'warning')
      loading.value = false
      return
    }

    console.log(`Найдено ${allContacts.length} контактов для рассылки`)

    // Подготавливаем batch-запросы для бизнес-процессов
    const batchCommands = []
    const processedDeals = new Set()

    for (const contact of allContacts) {
      // Выбираем ID шаблона в зависимости от типа сущности
      const templateId = entityInfo.ENTITY_ID === 'CRM_DYNAMIC_1052_DETAIL_TAB' ? 3318 : 3316
      
      // Определяем тип документа
      const documentType = entityInfo.ENTITY_ID === 'CRM_DYNAMIC_1052_DETAIL_TAB' 
        ? ['crm', 'Bitrix\\Crm\\Integration\\BizProc\\Document\\Dynamic', `DYNAMIC_1052_${entityInfo.ENTITY_VALUE_ID}`]
        : ['crm', 'CCrmDocumentDeal', `DEAL_${entityInfo.ENTITY_VALUE_ID}`]

      // Получаем ID сделки для этого контакта
      const contactDealIds = contactDealMap.get(contact.ID) || []
      const contactDealId = contactDealIds.length > 0 
        ? contactDealIds[0] 
        : (deals.value.length > 0 ? deals.value[0].ID : null)

      if (!contactDealId) {
        console.warn(`Для контакта ${contact.ID} не найдена связанная сделка`)
        continue
      }

      // Формируем имя для приветствия
      const contactName = contact.NAME || contact.FIRST_NAME || ''
      const greeting = contactName ? `${contactName}, здравствуйте!` : "Здравствуйте!"

      // Формируем имя отправителя
      const senderName = `${currentUser.LAST_NAME || ""} ${currentUser.NAME || ""} ${currentUser.SECOND_NAME || ""}`.trim()

      // Добавляем команду в batch
      batchCommands.push({
        method: 'bizproc.workflow.start',
        params: {
          TEMPLATE_ID: templateId,
          DOCUMENT_ID: documentType,
          PARAMETERS: {
            'fromemail': currentUser.EMAIL,
            'email': contact.EMAIL[0].VALUE,
            'event': eventTitle,
            'text': formData.input,
            'toname': greeting,
            'fromname': senderName,
            'phone': currentUser.PERSONAL_MOBILE ? currentUser.PERSONAL_MOBILE : currentUser.WORK_PHONE,
            'position': currentUser.WORK_POSITION || "",
          },
        }
      })

      // Отмечаем сделку как обработанную
      processedDeals.add(contactDealId)
    }

    // Выполняем batch-запросы
    if (batchCommands.length > 0) {
      const batchResults = await callBatch(batchCommands, 50)

      let successfulSends = 0
      let failedSends = 0

      batchResults.forEach((result, index) => {
        if (result && !result.error) {
          successfulSends++
        } else {
          failedSends++
          console.error(`Ошибка отправки для контакта ${allContacts[index].ID}:`, result?.error)
        }
      })
      // Обновляем стадии обработанных сделок
      for (const dealId of processedDeals) {
        try {
          await new Promise((resolve) => {
            BX24.callMethod(
              "crm.deal.update",
              {
                id: dealId,
                fields: {
                  STAGE_ID: "C32:PREPARATION"
                }
              },
              function(result) {
                if (result.error()) {
                  console.error(`Ошибка обновления стадии сделки ${dealId}:`, result.error())
                }
                resolve()
              }
            )
          })
        } catch (error) {
          console.error(`Ошибка при обновлении стадии сделки ${dealId}:`, error)
        }
      }
      // Добавляем комментарий в мероприятие
      if (successfulSends > 0) {
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

          if (eventId) {
            // Формируем текст комментария
            const userFullName = `${currentUser.LAST_NAME || ''} ${currentUser.NAME || ''} ${currentUser.SECOND_NAME || ''}`.trim()
            
            // Группируем контакты по компаниям для комментария
            const companyContacts = {}
            
            allContacts.forEach(contact => {
              const companyName = contact.COMPANY_TITLE || 'Без компании'
              const email = contact.EMAIL[0].VALUE
              const contactName = `${contact.LAST_NAME || ''} ${contact.NAME || ''} ${contact.SECOND_NAME || ''}`.trim() || 'Без имени'
              
              if (!companyContacts[companyName]) {
                companyContacts[companyName] = []
              }
              companyContacts[companyName].push(`${contactName} (${email})`)
            })

            // Формируем текст комментария
            let commentText = `✉️ ${userFullName} запустил приветственную рассылку:\n\n`
            commentText += `Сообщение: ${formData.input}\n\n`
            commentText += `Отправлено контактов: ${successfulSends}\n\n`
            
            // Добавляем информацию по компаниям
            Object.keys(companyContacts).forEach(companyName => {
              commentText += `Компания: ${companyName}\n`
              companyContacts[companyName].forEach(contactInfo => {
                commentText += `• ${contactInfo}\n`
              })
              commentText += '\n'
            })

            // Добавляем комментарий в мероприятие
            await new Promise((resolve) => {
              BX24.callMethod(
                "crm.timeline.comment.add",
                {
                  fields: {
                    ENTITY_ID: eventId,
                    ENTITY_TYPE: "dynamic_1052",
                    COMMENT: commentText,
                    AUTHOR_ID: currentUser.ID
                  }
                },
                function(result) {
                  if (result.error()) {
                    console.error('Ошибка добавления комментария в мероприятие:', result.error())
                  }
                  resolve()
                }
              )
            })
          }
        } catch (error) {
          console.error('Ошибка при добавлении комментария в мероприятие:', error)
        }
      }

      // Показываем результат
      if (successfulSends > 0) {
        showSnackbar(
          `Рассылка завершена. Успешно: ${successfulSends}, ошибок: ${failedSends}`,
          failedSends > 0 ? 'warning' : 'success'
        )
      } else {
        showSnackbar('Не удалось отправить ни одного сообщения', 'error')
      }

    } else {
      showSnackbar('Нет команд для выполнения', 'warning')
    }

    // Сбрасываем форму
    form.value.reset()
    formData.files = []
    formData.input = ''

  } catch (error) {
    console.error('Общая ошибка:', error)
    showSnackbar('Ошибка: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}
// Вспомогательная функция для добавления задержки
//const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const encodeFilesToBase64 = (files) => {
  return Promise.all(
    files.map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        
        reader.onload = () => {
          resolve({
            name: file.name,
            base64: reader.result.split(',')[1] // чистый base64 без префикса
          })
        }
        
        reader.onerror = error => reject(error)
        reader.readAsDataURL(file)
      })
    })
  )
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
      if (newTab === 'contacts' && deals.value.length === 0) {
        loadContacts()
      }
    })

    // Хуки жизненного цикла
    onMounted(() => {
      BX24.ready(function () {
        BX24.init(async function () {
          await checkEntityValidity()
          loadContacts()
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
      deals,
      contactsByCompany,
      filteredDeals,
      errorMessage,
      requiredRules,
      fileRules,
      isFormValid,
      totalContacts,
      excludedContactsCount,
      submitForm,
      showSnackbar,
      loadContacts,
      isExcluded,
      toggleExcludeContact,
      getExcludedCount,
      userDistributions,
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